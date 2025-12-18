const mongoose = require("mongoose");
const crypto = require("crypto"); // <-- ADD THIS

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    // Email verification
   isEmailVerified: {
     type: Boolean,
     default: false,
   },
    // --- ADD THESE NEW FIELDS ---
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
  },
  {
    timestamps: true,
  }
);

// --- ADD THIS METHOD ---
// This creates the un-hashed token and returns it (to be emailed)
// but saves the *hashed* version to the database for security.
userSchema.methods.createPasswordResetToken = function () {
  // 1. Create the random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2. Hash the token and save it to the DB
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3. Set an expiration time (e.g., 10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // 4. Return the *un-hashed* token
  return resetToken;
};

//Email verification
userSchema.methods.createEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000;

  return token;
};


module.exports = mongoose.model("User", userSchema);
