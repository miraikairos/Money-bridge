const User = require("../models/User");
const Deal = require("../models/Deal");

const createDeal = async (req, res) => {
  try {
    const { title, description, amount } = req.body;

    const deal = await Deal.create({
      title,
      description,
      amount,
      buyer: req.user._id,
    });

    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = { createDeal };
const acceptDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    deal.seller = req.user._id;
    deal.status = "accepted";

    await deal.save();

    res.json(deal);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
const fundDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    if (deal.buyer.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Only buyer can fund deal",
      });
    }

    const buyer = await User.findById(req.user._id);

    if (buyer.balance < deal.amount) {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    buyer.balance -= deal.amount;

    deal.escrowFunded = true;
    deal.fundedAt = new Date();
    deal.status = "funded";

    await buyer.save();
    await deal.save();

    res.json({
      message: "Deal funded successfully",
      buyerBalance: buyer.balance,
      deal,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
const deliverDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    if (deal.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Only seller can deliver",
      });
    }

   if (deal.status !== "funded") {
  return res.status(400).json({
    message: "Deal is not funded yet",
  });
}
    deal.status = "delivered";

    await deal.save();

    res.json({
      message: "Work delivered successfully",
      deal,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
const releaseDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    if (deal.buyer.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Only buyer can release funds",
      });
    }

    if (deal.status !== "delivered") {
      return res.status(400).json({
        message: "Work not delivered yet",
      });
    }

    const seller = await User.findById(deal.seller);

    seller.balance += deal.amount;

    deal.status = "completed";
    deal.escrowFunded = false;

    await seller.save();
    await deal.save();

    res.json({
      message: "Funds released successfully",
      sellerBalance: seller.balance,
      deal,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
module.exports = {
  createDeal,
  acceptDeal,
  fundDeal,
  deliverDeal,
  releaseDeal,
};