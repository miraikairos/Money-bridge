const express = require("express");

const router = express.Router();

const {
  createDeal,
  getDeals,
  getDealById,
  acceptDeal,
  agreeDeal,
  uploadSample,
  approveSample,
  confirmFunding,
  uploadFinalFile,
  acceptDelivery,
  cancelDeal,
  updateFundingStatus,
  releasePayment,
} = require("../controllers/dealController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/create", protect, upload.single("file"), createDeal);
router.get("/", protect, getDeals);
router.get("/:id", protect, getDealById);

router.put("/:id/accept", protect, acceptDeal);
router.put("/:id/agree", protect, agreeDeal);
router.post("/:id/sample", protect, upload.single("file"), uploadSample);
router.put("/:id/approve-sample", protect, approveSample);
router.put("/:id/confirm-funding", protect, confirmFunding);
router.post("/:id/final-file", protect, upload.single("file"), uploadFinalFile);
router.put("/:id/accept-delivery", protect, acceptDelivery);
router.put("/:id/cancel", protect, cancelDeal);

// Integration points for Member 3 (no JWT — add internal key before production)
router.put("/:id/funding-status", updateFundingStatus);
router.put("/:id/payment-release", releasePayment);

module.exports = router;
