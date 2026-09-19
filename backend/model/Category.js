const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      default: "Uncategorized",
    },
    type: {
      type: String,
      required: true,
      enum: ["income", "expense"],
    },

    // Set only on requests carrying an Idempotency-Key header
    // (i.e. creates that may have been replayed by the PWA's
    // offline queue). sparse so the unique-ish lookup in
    // categoryCtrl.js only ever matches real keys.
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

module.exports = mongoose.model("Category", categorySchema);