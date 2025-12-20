const express = require("express");
const transactionRouter = express.Router();

const isAuthenticated = require("../middlewares/isAuth");
const emailVerifiedOnly = require("../middlewares/emailVerifiedOnly");

const transactionController = require("../controllers/transactionCtrl");

// 🔐 CREATE TRANSACTION (email must be verified)
transactionRouter.post(
  "/transactions/create",
  isAuthenticated,
  emailVerifiedOnly,
  transactionController.create
);

// 🔐 GET TRANSACTIONS (email must be verified)
transactionRouter.get(
  "/transactions/lists",
  isAuthenticated,
  emailVerifiedOnly,
  transactionController.getFilteredTransactions
);

// 🔐 UPDATE TRANSACTION (email must be verified)
transactionRouter.put(
  "/transactions/update/:id",
  isAuthenticated,
  emailVerifiedOnly,
  transactionController.update
);

// 🔐 DELETE TRANSACTION (email must be verified)
transactionRouter.delete(
  "/transactions/delete/:id",
  isAuthenticated,
  emailVerifiedOnly,
  transactionController.delete
);

module.exports = transactionRouter;
