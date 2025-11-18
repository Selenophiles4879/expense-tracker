const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/User");
const sendEmail = require("../utils/sendEmail"); // <-- CHECK THIS LINE
const crypto = require("crypto"); // <-- CHECK THIS LINE

const usersController = {
  //! REGISTER
  register: asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new Error("All fields are required");
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new Error("User already exists");
    }

    // 2.NEW: Check for Duplicate Username (Fixes E11000)
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      // This is the clean, custom message the user will see
      throw new Error("The username is already taken. Please choose another."); 
    }
    
    // 3. Username length check (Keep your existing validation)
    if (username.length < 3) {
        throw new Error("Username must be at least 3 characters long");
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashed,
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  }),

  //! LOGIN
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  }),

// --- ADD THIS NEW FUNCTION ---
  //! FORGOT PASSWORD
  forgotPassword: asyncHandler(async (req, res) => {
    // 1. Find the user by email
    const { email } = req.body;
    const user = await User.findOne({ email });

    // (Security) Always send a success response, even if user not found
    if (!user) {
      res.json({ message: "If your email is registered, you will receive a reset link." });
      return;
    }

    // 2. Generate the reset token (this also saves the hashed version to the user)
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3. Create the reset URL
    // This must match your frontend route
    const resetURL = `process.env.FRONTEND_URL/users/reset-password/${resetToken}`;

    // 4. Send the email
    const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}\nIf you didn't forget your password, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Your Password Reset Token (Valid for 10 min)",
        message,
      });

      res.json({ message: "If your email is registered, you will receive a reset link." });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      throw new Error("There was an error sending the email. Try again later.");
    }
  }),

  // --- ADD THIS NEW FUNCTION ---
  //! RESET PASSWORD
  resetPassword: asyncHandler(async (req, res) => {
    // 1. Get the token from the URL and hash it
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // 2. Find user by the *hashed* token and check if it's expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // 3. If token is invalid or expired
    if (!user) {
      throw new Error("Token is invalid or has expired");
    }

    // 4. Set the new password
    const { password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    
    user.password = hashed;
    user.passwordResetToken = undefined; // Invalidate the token
    user.passwordResetExpires = undefined; // Invalidate the token
    await user.save();

    res.json({ message: "Password reset successfully. Please login." });
  }),

  //! PROFILE
  profile: asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new Error("User not found");
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  }),

  //! CHANGE PASSWORD
  changeUserPassword: asyncHandler(async (req, res) => {
    const { newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new Error("User not found");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save({ validateBeforeSave: false });

    res.json({ message: "Password changed successfully" });
  }),

  //! UPDATE PROFILE
  updateUserProfile: asyncHandler(async (req, res) => {
    const { email, username } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { email, username },
      { new: true }
    );

    if (!updated) {
      throw new Error("User not found");
    }

    res.json({
      message: "Profile updated",
      user: {
        id: updated._id,
        username: updated.username,
        email: updated.email,
      },
    });
  }),
};

module.exports = usersController;
