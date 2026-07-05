const express = require("express");

const router = express.Router();

const {
  createDeal,
  acceptDeal,
  fundDeal,
  deliverDeal,
  releaseDeal,
} = require("../controllers/dealController");

const { protect } = require("../middleware/authMiddleware");

router.post("/create", protect, createDeal);
router.put("/:id/accept", protect, acceptDeal);
router.put("/:id/fund", protect, fundDeal);
router.put("/:id/deliver", protect, deliverDeal);
router.put("/:id/release", protect, releaseDeal);
module.exports = router;