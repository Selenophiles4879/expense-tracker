const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["income", "expense"],
    },

    category: {
      type: String,
      required: true,
      default: "Uncategorized",
    },

    amount: {
      type: Number,
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    description: {
      type: String,
      required: false,
    },

    // Items are used for expense transactions
    items: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // Set only on requests carrying an Idempotency-Key header
    // (i.e. creates that may have been replayed by the PWA's
    // offline queue). Without this field, Mongoose's default
    // strict mode silently drops the key on save and
    // transactionCtrl.js's dedupe lookup never matches anything.
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
