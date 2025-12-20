const express = require("express");
const categoryRouter = express.Router();

const isAuthenticated = require("../middlewares/isAuth");
const emailVerifiedOnly = require("../middlewares/emailVerifiedOnly");
const categoryController = require("../controllers/categoryCtrl");

// 🔐 CREATE CATEGORY (email must be verified)
categoryRouter.post(
  "/categories/create",
  isAuthenticated,
  emailVerifiedOnly,
  categoryController.create
);

// 🔐 LIST CATEGORIES (email must be verified)
categoryRouter.get(
  "/categories/lists",
  isAuthenticated,
  emailVerifiedOnly,
  categoryController.lists
);

// 🔐 UPDATE CATEGORY (email must be verified)
categoryRouter.put(
  "/categories/update/:id",
  isAuthenticated,
  emailVerifiedOnly,
  categoryController.update
);

// 🔐 DELETE CATEGORY (email must be verified)
categoryRouter.delete(
  "/categories/delete/:id",
  isAuthenticated,
  emailVerifiedOnly,
  categoryController.delete
);

module.exports = categoryRouter;
