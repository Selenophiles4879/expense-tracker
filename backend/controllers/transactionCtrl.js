const asyncHandler = require("express-async-handler");
const Transaction = require("../model/Transaction");
const Category = require("../model/Category");

const transactionController = {
  //! CREATE TRANSACTION
  create: asyncHandler(async (req, res) => {
    const { type, category, amount, date, description } = req.body;

    if (!amount || !type || !date) {
      throw new Error("Type, amount, and date are required");
    }

    // --- FIX 1: Save the transaction with the logged-in user's ID ---
    const transaction = await Transaction.create({
      user: req.user.id, // This was missing
      type,
      category,
      amount,
      date,
      description,
    });

    res.status(201).json(transaction);
  }),

  //! LIST TRANSACTIONS WITH FILTERS
  getFilteredTransactions: asyncHandler(async (req, res) => {
    const { startDate, endDate, type, category } = req.query;

    // --- FIX 2: Create a filter that ALWAYS includes the user's ID ---
    let filters = { user: req.user.id }; // This was missing

    if (startDate) filters.date = { ...filters.date, $gte: new Date(startDate) };
    if (endDate) filters.date = { ...filters.date, $lte: new Date(endDate) };
    if (type) filters.type = type;
    if (category) filters.category = category;

    const transactions = await Transaction.find(filters).sort({ date: -1 });

    res.json(transactions);
  }),

  //! UPDATE TRANSACTION
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      res.status(404);
      throw new Error("Transaction not found");
    }

    // --- FIX 3: Add an ownership check ---
    // Make sure the transaction's user is the same as the logged-in user
    if (transaction.user.toString() !== req.user.id) {
      res.status(401);
      throw new Error("Not authorized to update this transaction");
    }

    // Update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true, // Return the updated document
        runValidators: true,
      }
    );

    res.json(updatedTransaction);
  }),

  //! DELETE TRANSACTION
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      res.status(404);
      throw new Error("Transaction not found");
    }

    // --- FIX 4: Add an ownership check ---
    if (transaction.user.toString() !== req.user.id) {
      res.status(401);
      throw new Error("Not authorized to delete this transaction");
    }

    await Transaction.findByIdAndDelete(id);

    res.json({ message: "Transaction removed successfully" });
  }),
};

module.exports = transactionController;