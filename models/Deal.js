const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true },
    description: { type: String, required: [true, "Description is required"] },

    // 'service' = seller posted an offer, 'request' = buyer posted a need
    dealType: { type: String, enum: ["service", "request"], required: true },

    // creator can be EITHER buyer or seller; counterpart is set on accept
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    creatorRole: { type: String, enum: ["buyer", "seller"], required: true },
    counterpart: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    budget: { type: Number, required: [true, "Budget is required"], min: 1 },
    timeline: { type: String, default: "" },
    category: { type: String, default: "Other" },

    // Optional reference/portfolio file attached at creation
    referenceFile: {
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
      uploadedAt: { type: Date },
    },

    // Agreement — tracked separately from acceptance
    buyerAgreed: { type: Boolean, default: false },
    sellerAgreed: { type: Boolean, default: false },

    // Sample file workflow (no reject/revision by design)
    sampleFile: {
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
      uploadedAt: { type: Date },
    },
    sampleStatus: {
      type: String,
      enum: ["not_uploaded", "uploaded", "approved"],
      default: "not_uploaded",
    },

    // Final/real file
    finalFile: {
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
      uploadedAt: { type: Date },
    },

    // ===== Integration fields for Member 3 (NO wallet logic here) =====
    paymentStatus: {
      type: String,
      enum: ["not_funded", "funded", "released"],
      default: "not_funded",
    },
    paymentRef: { type: String, default: "" }, // Member 3 stores tx/escrow id

    status: {
      type: String,
      enum: [
        "open",
        "accepted",
        "waiting_for_agreement",
        "sample_pending",
        "sample_uploaded",
        "waiting_for_funding",
        "funded",
        "seller_confirmed_funding",
        "final_file_uploaded",
        "ready_for_payment_release",
        "completed",
        "cancelled",
      ],
      default: "open",
    },

    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deal", dealSchema);
