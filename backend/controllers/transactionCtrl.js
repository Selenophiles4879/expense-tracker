const asyncHandler = require("express-async-handler");
const Transaction = require("../model/Transaction");

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

    if (!type || !amount || !date) {
      res.status(400);
      throw new Error("Type, amount, and date are required");
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      category,
      amount,
      date,
      description,
      items: type === "expense" ? items : [],
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

    // IMPORTANT:
    // Transaction must match BOTH:
    // 1. transaction _id
    // 2. logged-in user's id
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
    // 1. transaction _id
    // 2. logged-in user's id
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
