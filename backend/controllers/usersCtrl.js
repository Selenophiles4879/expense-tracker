const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { sendEmail } = require("../utils/sendEmail");
const crypto = require("crypto");

const usersController = {
  //! REGISTER
  register: asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new Error("All fields are required");
    }

    if (await User.findOne({ email })) {
      res.status(409);
      throw new Error("This email is already registered.");
    }

    if (await User.findOne({ username })) {
      res.status(409);
      throw new Error("The username is already taken.");
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      isEmailVerified: false,
    });

    // ✅ SEND EMAIL ONLY IF TOKEN DOES NOT EXIST OR IS EXPIRED
    if (
      !user.emailVerificationToken ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < Date.now()
    ) {
      const verifyToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const verifyURL = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

      try {
        await sendEmail({
          to: user.email,
          subject: "Verify your email address",
          htmlContent: `
<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Hi <strong>${user.username}</strong>,
</p>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  We received a request to verify your Email for your Expense Tracker account.
</p>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Please click the button below to verify your Email. This link will expire in <strong>10 minutes</strong>.
</p>

<div style="text-align:center; margin:30px 0;">
  <a href="${verifyURL}" 
     style="
       background-color: #4CAF50; 
       color: white; 
       padding: 12px 25px; 
       text-decoration: none; 
       border-radius: 5px;
       font-weight: bold;
       font-family: Arial, sans-serif;
       display: inline-block;
       min-width: 150px;
       width: 80%;
       max-width: 250px;
       box-sizing: border-box;
     ">
     Verify Email
  </a>
</div>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  If you are not trying to verify your Email for Registration, you can safely ignore this email.
</p>

<p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #b71c1c;">
  This is a secure message. Please do not share this link with anyone.
  The link will expire after one use.
</p>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Thanks,<br/>Expense Tracker Team
</p>
`,
        });
      } catch (err) {
        console.error("❌ Verification email failed:", err);
      }
    }

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
    });
  }),

  // EMAIL VERIFY
  verifyEmail: asyncHandler(async (req, res) => {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOneAndUpdate(
      {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() },
      },
      {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
      { new: true }
    );

    if (!user) {
      res.status(400);
      throw new Error("Verification link is invalid or expired");
    }

    res.json({ message: "Email verified successfully" });
  }),

  //! LOGIN
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    if (!user.isEmailVerified) {
      // ✅ SEND ONLY IF TOKEN EXPIRED
      if (
        !user.emailVerificationToken ||
        !user.emailVerificationExpires ||
        user.emailVerificationExpires < Date.now()
      ) {
        const verifyToken = user.createEmailVerificationToken();
        await user.save({ validateBeforeSave: false });

        const verifyURL = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

        await sendEmail({
          to: user.email,
          subject: "Verify your email address",
          htmlContent: `
<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Hi <strong>${user.username}</strong>,
</p>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  We received a request to verify your Email for your Expense Tracker account.
</p>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Please click the button below to verify your Email. This link will expire in <strong>15 minutes</strong>.
</p>

<div style="text-align:center; margin:30px 0;">
  <a href="${verifyURL}" 
     style="
       background-color: #4CAF50; 
       color: white; 
       padding: 12px 25px; 
       text-decoration: none; 
       border-radius: 5px;
       font-weight: bold;
       font-family: Arial, sans-serif;
       display: inline-block;
       min-width: 150px;
       width: 80%;
       max-width: 250px;
       box-sizing: border-box;
     ">
     Verify Email
  </a>
</div>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  If you are not trying to verify your Email for Registration, you can safely ignore this email.
</p>

<p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #b71c1c;">
  This is a secure message. Please do not share this link with anyone.
  The link will expire after one use.
</p>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Thanks,<br/>Expense Tracker Team
</p>
`,
        });
      }

      res.status(403);
      throw new Error("Please verify your email before logging in.");
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
        isEmailVerified: user.isEmailVerified,
      },
    });
  }),

  //! UPDATE PROFILE
  updateUserProfile: asyncHandler(async (req, res) => {
    const { email, username } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) throw new Error("User not found");

    if (email && email !== user.email) {
      if (await User.findOne({ email })) {
        res.status(409);
        throw new Error("This email is already taken by another user.");
      }

      user.email = email;
      user.isEmailVerified = false;

      // ✅ SEND ONLY IF TOKEN EXPIRED
      if (
        !user.emailVerificationToken ||
        !user.emailVerificationExpires ||
        user.emailVerificationExpires < Date.now()
      ) {
        const verifyToken = user.createEmailVerificationToken();
        await user.save({ validateBeforeSave: false });

        const verifyURL = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

        await sendEmail({
          to: email,
          subject: "Verify your new email",
          htmlContent: `
<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Hi <strong>${user.username}</strong>,
</p>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Please click the button below to verify your Email. This link will expire in <strong>10 minutes</strong>.
</p>

<div style="text-align:center; margin:30px 0;">
  <a href="${verifyURL}" 
     style="
       background-color: #4CAF50; 
       color: white; 
       padding: 12px 25px; 
       text-decoration: none; 
       border-radius: 5px;
       font-weight: bold;
       font-family: Arial, sans-serif;
       display: inline-block;
       min-width: 150px;
       width: 80%;
       max-width: 250px;
       box-sizing: border-box;
     ">
     Verify Email
  </a>
</div>

<p style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5;">
  Thanks,<br/>Expense Tracker Team
</p>
`,
        });
      }
    }

    if (username) user.username = username;

    const updatedUser = await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
      },
    });
  }),
};

module.exports = usersController;
