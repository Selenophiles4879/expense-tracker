const express = require("express");
const usersController = require("../controllers/usersCtrl");
const isAuthenticated = require("../middlewares/isAuth");

const userRouter = express.Router();

// REGISTER
userRouter.post("/users/register", usersController.register);

// LOGIN
userRouter.post("/users/login", usersController.login);

// --- ADD THESE NEW ROUTES ---
userRouter.post("/users/forgot-password", usersController.forgotPassword);
userRouter.put("/users/reset-password/:token", usersController.resetPassword);

// PROFILE
userRouter.get("/users/profile", isAuthenticated, usersController.profile);

// UPDATE PROFILE
userRouter.put("/users/update-profile", isAuthenticated, usersController.updateUserProfile);

// CHANGE PASSWORD
userRouter.put("/users/change-password", isAuthenticated, usersController.changeUserPassword);

module.exports = userRouter;
