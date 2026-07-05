const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    amount: {
      type: Number,
      required: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    escrowFunded: {
  type: Boolean,
  default: false,
},
fundedAt: {
  type: Date,
},

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "funded",
        "delivered",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deal", dealSchema);