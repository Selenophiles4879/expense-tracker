const asyncHandler = require("express-async-handler");
const Transaction = require("../model/Transaction");

const MAX_DESCRIPTION_LENGTH = 100;

const transactionController = {
  //! CREATE TRANSACTION
  create: asyncHandler(async (req, res) => {
    const {
      type,
      category,
      amount,
      date,
      description,
      items = [],
    } = req.body;

    // Validate required fields
    if (!type || !amount || !date) {
      res.status(400);
      throw new Error("Type, amount, and date are required");
    }

    // Validate description length
    if (
      description !== undefined &&
      description !== null &&
      String(description).length > MAX_DESCRIPTION_LENGTH
    ) {
      res.status(400);
      throw new Error(
        `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`
      );
    }

    // -----------------------------------------------------
    // IDEMPOTENCY (offline queue support)
    // -----------------------------------------------------
    //
    // The PWA's offline queue may replay a "create transaction"
    // request more than once - e.g. the original request actually
    // reached the server, but the connection dropped before the
    // client saw the response, so it gets queued and retried too.
    //
    // When the client supplies an Idempotency-Key, return the
    // already-created transaction instead of creating a duplicate.
    //
    // NOTE: this requires an `idempotencyKey` field on the
    // Transaction model, e.g.:
    //
    //   idempotencyKey: { type: String, index: true, sparse: true }
    //
    const idempotencyKey = req.header("Idempotency-Key");

    if (idempotencyKey) {
      const existingTransaction = await Transaction.findOne({
        user: req.user.id,
        idempotencyKey,
      });

      if (existingTransaction) {
        return res.status(200).json(existingTransaction);
      }
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      category,
      amount,
      date,
      description,
      items: type === "expense" ? items : [],
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });

    res.status(201).json(transaction);
  }),

  //! LIST TRANSACTIONS WITH FILTERS
  getFilteredTransactions: asyncHandler(async (req, res) => {
    const { startDate, endDate, type, category } = req.query;

    // Only get transactions belonging to logged-in user
    const filters = {
      user: req.user.id,
    };

    // Date filters
    if (startDate || endDate) {
      filters.date = {};

      if (startDate) {
        filters.date.$gte = new Date(startDate);
      }

      if (endDate) {
        filters.date.$lte = new Date(endDate);
      }
    }

    // Type filter
    if (type) {
      filters.type = type;
    }

    // Category filter
    if (category && category !== "All") {
      filters.category = category;
    }

    const transactions = await Transaction.find(filters).sort({
      date: -1,
    });

    res.status(200).json(transactions);
  }),

  //! UPDATE TRANSACTION
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const {
      type,
      category,
      amount,
      date,
      description,
      items = [],
    } = req.body;

    // Validate description length
    if (
      description !== undefined &&
      description !== null &&
      String(description).length > MAX_DESCRIPTION_LENGTH
    ) {
      res.status(400);
      throw new Error(
        `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`
      );
    }

    // IMPORTANT:
    // Transaction must match BOTH:
    // 1. Transaction _id
    // 2. Logged-in user's id
    const updatedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: id,
        user: req.user.id,
      },
      {
        type,
        category,
        amount,
        date,
        description,
        items: type === "expense" ? items : [],
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTransaction) {
      res.status(404);
      throw new Error(
        "Transaction not found or you are not authorized to update it"
      );
    }

    res.status(200).json(updatedTransaction);
  }),

  //! DELETE TRANSACTION
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    // IMPORTANT:
    // Transaction must match BOTH:
    // 1. Transaction _id
    // 2. Logged-in user's id
    const deletedTransaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!deletedTransaction) {
      res.status(404);
      throw new Error(
        "Transaction not found or you are not authorized to delete it"
      );
    }

    res.status(200).json({
      message: "Transaction removed successfully",
      transaction: deletedTransaction,
    });
  }),
};

module.exports = transactionController;
