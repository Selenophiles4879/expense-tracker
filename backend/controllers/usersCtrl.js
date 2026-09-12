const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { sendEmail } = require("../utils/sendEmail");
const crypto = require("crypto");

// ---------------------------------------------------------
// SEND EMAIL VERIFICATION
// ---------------------------------------------------------
const sendVerificationEmail = async (user, subject = "Verify your email address") => {
  const verifyToken = user.createEmailVerificationToken();

  await user.save({ validateBeforeSave: false });

  const verifyURL = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

  await sendEmail({
    to: user.email,
    subject,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; font-size:16px; line-height:1.5; color:#333;">

        <p>
          Hi <strong>${user.username}</strong>,
        </p>

        <p>
          We received a request to verify your Email for your Expense Tracker account.
        </p>

        <p>
          Please click the button below to verify your Email.
          This link will expire in <strong>10 minutes</strong>.
        </p>

        <div style="text-align:center; margin:30px 0;">
          <a
            href="${verifyURL}"
            style="
              background-color:#4CAF50;
              color:white;
              padding:12px 25px;
              text-decoration:none;
              border-radius:5px;
              font-weight:bold;
              font-family:Arial, sans-serif;
              display:inline-block;
              min-width:150px;
              width:80%;
              max-width:250px;
              box-sizing:border-box;
            "
          >
            Verify Email
          </a>
        </div>

        <p>
          If you are not trying to verify your Email for your Expense Tracker
          account, you can safely ignore this email.
        </p>

        <p style="font-size:14px; line-height:1.6; color:#b71c1c;">
          This is a secure message. Please do not share this link with anyone.
          The link will expire after one use.
        </p>

        <p>
          Thanks,<br/>
          Expense Tracker Team
        </p>

      </div>
    `,
  });
};


// ---------------------------------------------------------
// CONTROLLER
// ---------------------------------------------------------
const usersController = {

  // =======================================================
  // REGISTER
  // =======================================================
  register: asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error("All fields are required");
    }

    // -----------------------------------------------------
    // CHECK EXISTING EMAIL
    // -----------------------------------------------------
    const existingUser = await User.findOne({ email });

    if (existingUser) {

      // ---------------------------------------------------
      // EXISTING + VERIFIED
      // ---------------------------------------------------
      if (existingUser.isEmailVerified) {
        res.status(409);
        throw new Error("This email is already registered. Please login instead.");
      }

      // ---------------------------------------------------
      // EXISTING + NOT VERIFIED
      // ---------------------------------------------------

      // Verification link is missing or expired
      const verificationExpired =
        !existingUser.emailVerificationToken ||
        !existingUser.emailVerificationExpires ||
        existingUser.emailVerificationExpires < Date.now();

      if (verificationExpired) {

        // Generate a fresh verification token
        try {
          await sendVerificationEmail(
            existingUser,
            "Verify your email address"
          );

          return res.status(409).json({
            message:
              "This email is already registered but not verified. Your previous verification link has expired, so a new verification email has been sent. Please verify your email first."
          });

        } catch (error) {
          console.error(
            "Verification email resend failed:",
            error
          );

          res.status(500);
          throw new Error(
            "We could not send the verification email. Please try again later."
          );
        }
      }

      // ---------------------------------------------------
      // EXISTING + NOT VERIFIED + TOKEN STILL VALID
      // ---------------------------------------------------
      return res.status(409).json({
        message:
          "This email is already registered but not verified. Please verify your email first using the verification link that was sent to you."
      });
    }

    // -----------------------------------------------------
    // CHECK USERNAME
    // -----------------------------------------------------
    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      res.status(409);
      throw new Error("The username is already taken.");
    }

    // -----------------------------------------------------
    // CREATE NEW USER
    // -----------------------------------------------------
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
      isEmailVerified: false,
    });

    // -----------------------------------------------------
    // SEND VERIFICATION EMAIL
    // -----------------------------------------------------
    try {
      await sendVerificationEmail(
        user,
        "Verify your email address"
      );
    } catch (error) {
      console.error(
        "Verification email failed:",
        error
      );

      // Remove the user if verification email could not be sent
      await User.findByIdAndDelete(user._id);

      res.status(500);
      throw new Error(
        "Registration completed, but we could not send the verification email. Please try again."
      );
    }

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  }),


  // =======================================================
  // VERIFY EMAIL
  // =======================================================
  verifyEmail: asyncHandler(async (req, res) => {

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOneAndUpdate(
      {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
          $gt: Date.now(),
        },
      },
      {
        $set: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      },
      {
        new: true,
      }
    );

    if (!user) {
      res.status(400);
      throw new Error(
        "Verification link is invalid or expired"
      );
    }

    res.json({
      message: "Email verified successfully",
    });
  }),


  // =======================================================
  // LOGIN
  // =======================================================
  login: asyncHandler(async (req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    // -----------------------------------------------------
    // USER NOT FOUND
    // -----------------------------------------------------
    if (!user) {
      res.status(404);
      throw new Error(
        "User not found. Please register yourself."
      );
    }

    // -----------------------------------------------------
    // PASSWORD CHECK
    // -----------------------------------------------------
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      res.status(401);
      throw new Error(
        "Incorrect password. Please try again."
      );
    }

    // -----------------------------------------------------
    // EMAIL VERIFICATION CHECK
    // -----------------------------------------------------
    if (!user.isEmailVerified) {

      const verificationExpired =
        !user.emailVerificationToken ||
        !user.emailVerificationExpires ||
        user.emailVerificationExpires < Date.now();

      // ---------------------------------------------------
      // TOKEN EXPIRED → SEND NEW EMAIL
      // ---------------------------------------------------
      if (verificationExpired) {

        try {

          await sendVerificationEmail(
            user,
            "Verify your email address"
          );

          res.status(403);

          throw new Error(
            "Please verify your email first. Your previous verification link has expired, so a new verification email has been sent."
          );

        } catch (error) {

          // Do not convert our intended 403 message
          if (
            error.message ===
            "Please verify your email first. Your previous verification link has expired, so a new verification email has been sent."
          ) {
            throw error;
          }

          console.error(
            "Verification email resend failed:",
            error
          );

          res.status(500);

          throw new Error(
            "We could not send a new verification email. Please try again later."
          );
        }
      }

      // ---------------------------------------------------
      // TOKEN STILL VALID
      // ---------------------------------------------------
      res.status(403);

      throw new Error(
        "Please verify your email first using the verification link that was sent to you."
      );
    }

    // -----------------------------------------------------
    // CREATE JWT
    // -----------------------------------------------------
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // -----------------------------------------------------
    // LOGIN SUCCESS
    // -----------------------------------------------------
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


  // =======================================================
  // UPDATE PROFILE
  // =======================================================
  updateUserProfile: asyncHandler(async (req, res) => {

    const { email, username } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      throw new Error("User not found");
    }

    // -----------------------------------------------------
    // EMAIL CHANGE
    // -----------------------------------------------------
    if (email && email !== user.email) {

      const emailExists = await User.findOne({ email });

      if (emailExists) {
        res.status(409);
        throw new Error(
          "This email is already taken by another user."
        );
      }

      user.email = email;
      user.isEmailVerified = false;

      // Generate new verification token
      const verifyToken = user.createEmailVerificationToken();

      await user.save({
        validateBeforeSave: false,
      });

      const verifyURL =
        `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

      await sendEmail({
        to: email,
        subject: "Verify your new email",
        htmlContent: `
          <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#333;">

            <p>
              Hi <strong>${user.username}</strong>,
            </p>

            <p>
              You recently changed the email address associated
              with your Expense Tracker account.
            </p>

            <p>
              Please click the button below to verify your new Email.
              This link will expire in <strong>10 minutes</strong>.
            </p>

            <div style="text-align:center;margin:30px 0;">
              <a
                href="${verifyURL}"
                style="
                  background-color:#4CAF50;
                  color:white;
                  padding:12px 25px;
                  text-decoration:none;
                  border-radius:5px;
                  font-weight:bold;
                  display:inline-block;
                  min-width:150px;
                  width:80%;
                  max-width:250px;
                  box-sizing:border-box;
                "
              >
                Verify Email
              </a>
            </div>

            <p>
              Thanks,<br/>
              Expense Tracker Team
            </p>

          </div>
        `,
      });
    }

    // -----------------------------------------------------
    // USERNAME CHANGE
    // -----------------------------------------------------
    if (username && username !== user.username) {

      const usernameExists = await User.findOne({
        username,
      });

      if (usernameExists) {
        res.status(409);
        throw new Error(
          "This username is already taken by another user."
        );
      }

      user.username = username;
    }

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


  // =======================================================
  // FORGOT PASSWORD
  // =======================================================
  forgotPassword: asyncHandler(async (req, res) => {

    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error(
        "Please provide an email address"
      );
    }

    const user = await User.findOne({ email });

    // Security: don't reveal whether email exists
    if (!user) {
      return res.json({
        message:
          "If your email is registered, you will receive a reset link.",
      });
    }

    const resetToken =
      user.createPasswordResetToken();

    await user.save({
      validateBeforeSave: false,
    });

    const resetURL =
      `${process.env.FRONTEND_URL}/users/reset-password/${resetToken}`;

    const htmlMessage = `
      <p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">
        Hi <strong>${user.username}</strong>,
      </p>

      <p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">
        We received a request to reset your password
        for your Expense Tracker account.
      </p>

      <p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">
        Please click the button below to reset your password.
        This link will expire in <strong>10 minutes</strong>.
      </p>

      <div style="text-align:center;margin:30px 0;">
        <a
          href="${resetURL}"
          style="
            background-color:#4CAF50;
            color:white;
            padding:12px 25px;
            text-decoration:none;
            border-radius:5px;
            font-weight:bold;
            display:inline-block;
            min-width:150px;
            width:80%;
            max-width:250px;
            box-sizing:border-box;
          "
        >
          Reset Password
        </a>
      </div>

      <p>
        If you did not request a password reset,
        you can safely ignore this email.
      </p>

      <p style="font-size:14px;color:#b71c1c;">
        This is a secure message.
        Please do not share this link with anyone.
        The link will expire after one use.
      </p>

      <p>
        Thanks,<br/>
        Expense Tracker Team
      </p>
    `;

    try {

      await sendEmail({
        to: user.email,
        subject: "Your Password Reset Request",
        htmlContent: htmlMessage,
      });

      return res.json({
        message:
          "If your email is registered, you will receive a reset link.",
      });

    } catch (err) {

      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save({
        validateBeforeSave: false,
      });

      console.error(
        "Error sending reset email:",
        err
      );

      res.status(500);

      throw new Error(
        "There was an error sending the email. Try again later."
      );
    }
  }),


  // =======================================================
  // RESET PASSWORD
  // =======================================================
  resetPassword: asyncHandler(async (req, res) => {

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      throw new Error(
        "Token is invalid or has expired"
      );
    }

    const { password } = req.body;

    const salt = await bcrypt.genSalt(10);

    const hashed =
      await bcrypt.hash(password, salt);

    user.password = hashed;

    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({
      message:
        "Password reset successfully. Please login.",
    });
  }),


  // =======================================================
  // PROFILE
  // =======================================================
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


  // =======================================================
  // CHANGE PASSWORD
  // =======================================================
  changeUserPassword: asyncHandler(async (req, res) => {

    const { newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      throw new Error("User not found");
    }

    const salt = await bcrypt.genSalt(10);

    user.password =
      await bcrypt.hash(newPassword, salt);

    await user.save({
      validateBeforeSave: false,
    });

    res.json({
      message:
        "Password changed successfully",
    });
  }),
};


module.exports = usersController;
