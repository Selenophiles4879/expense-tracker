const express = require("express");
const isAuthenticated = require("../middlewares/isAuth");
const transactionController = require("../controllers/transactionCtrl");

const transactionRouter = express.Router();

transactionRouter.post("/transactions/create", isAuthenticated, transactionController.create);

transactionRouter.get("/transactions/lists", isAuthenticated, transactionController.getFilteredTransactions);

transactionRouter.put("/transactions/update/:id", isAuthenticated, transactionController.update);

transactionRouter.delete("/transactions/delete/:id", isAuthenticated, transactionController.delete);

module.exports = transactionRouter;
