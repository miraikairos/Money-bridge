const Deal = require("../models/Deal");

// ---------- helpers ----------
const userIdOf = (req) => req.user.id || req.user._id;

const POPULATE = "creator counterpart";

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function loadDeal(id) {
  const deal = await Deal.findById(id).populate(POPULATE, "name email");
  if (!deal) throw httpError(404, "Deal not found");
  return deal;
}

function roleInDeal(deal, userId) {
  const uid = String(userId);
  if (String(deal.creator._id) === uid) return deal.creatorRole;
  if (deal.counterpart && String(deal.counterpart._id) === uid) {
    return deal.creatorRole === "buyer" ? "seller" : "buyer";
  }
  return null;
}

function isParticipant(deal, userId) {
  return roleInDeal(deal, userId) !== null;
}

const CANCELLABLE = ["open", "accepted", "waiting_for_agreement", "sample_pending", "sample_uploaded"];

const dealToJson = (d) => ({
  _id: d._id,
  title: d.title,
  description: d.description,
  budget: d.budget,
  timeline: d.timeline,
  category: d.category,
  dealType: d.dealType,
  status: d.status,
  creator: d.creator ? { _id: d.creator._id, name: d.creator.name, email: d.creator.email } : null,
  creatorRole: d.creatorRole,
  counterpart: d.counterpart ? { _id: d.counterpart._id, name: d.counterpart.name, email: d.counterpart.email } : null,
  buyerAgreed: d.buyerAgreed,
  sellerAgreed: d.sellerAgreed,
  referenceFile: d.referenceFile,
  sampleFile: d.sampleFile,
  sampleStatus: d.sampleStatus,
  finalFile: d.finalFile,
  paymentStatus: d.paymentStatus,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

// ---------- controllers ----------

// POST /api/deals/create
exports.createDeal = async (req, res, next) => {
  try {
    const { title, description, budget, timeline, category } = req.body;
    if (!title || !description || !budget) {
      return res.status(400).json({ message: "title, description and budget are required" });
    }
    const creatorRole = (req.user && req.user.role) || req.body.role;
    if (!["buyer", "seller"].includes(creatorRole)) {
      return res.status(400).json({ message: "User role missing — cannot determine deal type" });
    }
    const deal = await Deal.create({
      title,
      description,
      budget: Number(budget),
      timeline: timeline || "",
      category: category || "Other",
      dealType: creatorRole === "seller" ? "service" : "request",
      creator: userIdOf(req),
      creatorRole,
      referenceFile: req.file
        ? { fileName: req.file.originalname, fileUrl: `/uploads/${req.file.filename}`, uploadedAt: new Date() }
        : { fileName: "", fileUrl: "", uploadedAt: null },
    });
    res.status(201).json({ message: "Deal created", deal: dealToJson(deal) });
  } catch (err) { next(err); }
};

// GET /api/deals?scope=available|mine&type=service|request
exports.getDeals = async (req, res, next) => {
  try {
    const uid = userIdOf(req);
    const { scope = "available", type } = req.query;
    const q = {};
    if (type) q.dealType = type;

    if (scope === "mine") {
      q.$or = [{ creator: uid }, { counterpart: uid }];
    } else {
      q.status = "open";
      q.creator = { $ne: uid };
    }
    const deals = await Deal.find(q).populate(POPULATE, "name email").sort({ createdAt: -1 });
    res.json({ count: deals.length, deals: deals.map(dealToJson) });
  } catch (err) { next(err); }
};

// GET /api/deals/:id
exports.getDealById = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    if (deal.status !== "open" && !isParticipant(deal, userIdOf(req))) {
      return res.status(403).json({ message: "You are not a participant in this deal" });
    }
    res.json({ deal: { ...dealToJson(deal), yourRole: roleInDeal(deal, userIdOf(req)) } });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/accept
exports.acceptDeal = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    const uid = userIdOf(req);
    if (deal.status !== "open") return res.status(400).json({ message: "Deal is not open" });
    if (String(deal.creator._id) === String(uid)) {
      return res.status(403).json({ message: "You cannot accept your own deal" });
    }
    deal.counterpart = uid;
    deal.status = "accepted";
    await deal.save();
    const fresh = await Deal.findById(deal._id).populate(POPULATE, "name email");
    res.json({ message: "Deal accepted — now awaiting agreement from both parties", deal: dealToJson(fresh) });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/agree
exports.agreeDeal = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    const uid = userIdOf(req);
    const role = roleInDeal(deal, uid);
    if (!role) return res.status(403).json({ message: "You are not part of this deal" });
    if (!["accepted", "waiting_for_agreement"].includes(deal.status)) {
      return res.status(400).json({ message: `Cannot agree at status "${deal.status}"` });
    }
    if (role === "buyer") deal.buyerAgreed = true;
    else deal.sellerAgreed = true;

    deal.status = deal.buyerAgreed && deal.sellerAgreed ? "sample_pending" : "waiting_for_agreement";
    await deal.save();
    const fresh = await Deal.findById(deal._id).populate(POPULATE, "name email");
    res.json({
      message: deal.status === "sample_pending" ? "Both parties agreed — seller can upload sample" : "Agreement recorded — waiting for the other party",
      deal: dealToJson(fresh),
    });
  } catch (err) { next(err); }
};

// POST /api/deals/:id/sample — SELLER ONLY
exports.uploadSample = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    const role = roleInDeal(deal, userIdOf(req));
    if (role !== "seller") return res.status(403).json({ message: "Only the seller can upload the sample" });
    if (deal.status !== "sample_pending") {
      return res.status(400).json({ message: `Sample upload not allowed at status "${deal.status}"` });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded (field name must be "file")' });

    deal.sampleFile = { fileName: req.file.originalname, fileUrl: `/uploads/${req.file.filename}`, uploadedAt: new Date() };
    deal.sampleStatus = "uploaded";
    deal.status = "sample_uploaded";
    await deal.save();
    const fresh = await Deal.findById(deal._id).populate(POPULATE, "name email");
    res.json({ message: "Sample uploaded — waiting for buyer review", deal: dealToJson(fresh) });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/approve-sample — BUYER ONLY
exports.approveSample = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    const role = roleInDeal(deal, userIdOf(req));
    if (role !== "buyer") return res.status(403).json({ message: "Only the buyer can approve the sample" });
    if (deal.status !== "sample_uploaded") {
      return res.status(400).json({ message: "No sample is awaiting approval" });
    }
    deal.sampleStatus = "approved";
    deal.status = "waiting_for_funding";
    await deal.save();
    const fresh = await Deal.findById(deal._id).populate(POPULATE, "name email");
    res.json({ message: "Sample approved — deal is now waiting for funding", deal: dealToJson(fresh) });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/confirm-funding — SELLER ONLY
exports.confirmFunding = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    const role = roleInDeal(deal, userIdOf(req));
    if (role !== "seller") return res.status(403).json({ message: "Only the seller can confirm funding" });
    if (deal.status !== "funded") return res.status(400).json({ message: "Deal is not marked as funded yet" });
    deal.status = "seller_confirmed_funding";
    await deal.save();
    const fresh = await Deal.findById(deal._id).populate(POPULATE, "name email");
    res.json({ message: "Seller confirmed funding — final file can now be uploaded", deal: dealToJson(fresh) });
  } catch (err) { next(err); }
};

// POST /api/deals/:id/final-file — SELLER ONLY
exports.uploadFinalFile = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    const role = roleInDeal(deal, userIdOf(req));
    if (role !== "seller") return res.status(403).json({ message: "Only the seller can upload the final file" });
    if (deal.status !== "seller_confirmed_funding") {
      return res.status(400).json({ message: `Final upload not allowed at status "${deal.status}"` });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded (field name must be "file")' });

    deal.finalFile = { fileName: req.file.originalname, fileUrl: `/uploads/${req.file.filename}`, uploadedAt: new Date() };
    deal.status = "final_file_uploaded";
    await deal.save();
    const fresh = await Deal.findById(deal._id).populate(POPULATE, "name email");
    res.json({ message: "Final file uploaded — waiting for buyer delivery acceptance", deal: dealToJson(fresh) });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/accept-delivery — BUYER ONLY
exports.acceptDelivery = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    const role = roleInDeal(deal, userIdOf(req));
    if (role !== "buyer") return res.status(403).json({ message: "Only the buyer can accept final delivery" });
    if (deal.status !== "final_file_uploaded") {
      return res.status(400).json({ message: "No final file is awaiting acceptance" });
    }
    deal.status = "ready_for_payment_release";
    await deal.save();
    const fresh = await Deal.findById(deal._id).populate(POPULATE, "name email");
    res.json({ message: "Delivery accepted — deal is ready for payment release", deal: dealToJson(fresh) });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/funding-status — MEMBER 3 INTEGRATION (no JWT)
exports.updateFundingStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentRef } = req.body;
    const deal = await loadDeal(req.params.id);
    if (paymentStatus === "funded") {
      if (deal.status !== "waiting_for_funding") {
        return res.status(400).json({ message: `Cannot mark funded at status "${deal.status}"` });
      }
      deal.paymentStatus = "funded";
      if (paymentRef) deal.paymentRef = paymentRef;
      deal.status = "funded";
    } else if (paymentStatus === "not_funded") {
      if (!["funded", "waiting_for_funding"].includes(deal.status)) {
        return res.status(400).json({ message: "Deal is not in a funding stage" });
      }
      deal.paymentStatus = "not_funded";
      deal.status = "waiting_for_funding";
    } else {
      return res.status(400).json({ message: 'paymentStatus must be "funded" or "not_funded"' });
    }
    await deal.save();
    res.json({ message: `Funding status updated to ${deal.paymentStatus}`, deal: dealToJson(deal) });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/payment-release — MEMBER 3 INTEGRATION (no JWT)
exports.releasePayment = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    if (deal.status !== "ready_for_payment_release") {
      return res.status(400).json({ message: `Cannot release at status "${deal.status}"` });
    }
    deal.paymentStatus = "released";
    if (req.body && req.body.paymentRef) deal.paymentRef = req.body.paymentRef;
    deal.status = "completed";
    await deal.save();
    res.json({ message: "Payment marked as released — deal completed", deal: dealToJson(deal) });
  } catch (err) { next(err); }
};

// PUT /api/deals/:id/cancel
exports.cancelDeal = async (req, res, next) => {
  try {
    const deal = await loadDeal(req.params.id);
    const uid = userIdOf(req);
    if (!isParticipant(deal, uid)) return res.status(403).json({ message: "You are not part of this deal" });
    if (!CANCELLABLE.includes(deal.status)) {
      return res.status(400).json({ message: `Deal cannot be cancelled at status "${deal.status}"` });
    }
    deal.status = "cancelled";
    deal.cancelledBy = uid;
    deal.cancelReason = (req.body && req.body.reason) || "";
    await deal.save();
    res.json({ message: "Deal cancelled", deal: dealToJson(deal) });
  } catch (err) { next(err); }
};
