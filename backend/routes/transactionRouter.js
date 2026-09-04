const express = require("express");
const transactionRouter = express.Router();

const isAuthenticated = require("../middlewares/isAuth");
const emailVerifiedOnly = require("../middlewares/emailVerifiedOnly");

const transactionController = require("../controllers/transactionCtrl");

// CREATE TRANSACTION
transactionRouter.post(
  "/transactions/create",
  isAuthenticated,
  emailVerifiedOnly,
  transactionController.create
);

// GET TRANSACTIONS
transactionRouter.get(
  "/transactions/lists",
  isAuthenticated,
  emailVerifiedOnly,
  transactionController.getFilteredTransactions
);

// UPDATE TRANSACTION
transactionRouter.put(
  "/transactions/update/:id",
  isAuthenticated,
  emailVerifiedOnly,
  transactionController.update
);

// DELETE TRANSACTION
transactionRouter.delete(
  "/transactions/delete/:id",
  isAuthenticated,
  emailVerifiedOnly,
  transactionController.delete
);

module.exports = transactionRouter;
