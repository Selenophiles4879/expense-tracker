const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      maxlength: 30,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // =====================================================
    // EMAIL VERIFICATION
    // =====================================================
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      default: undefined,
    },

    emailVerificationExpires: {
      type: Date,
      default: undefined,
    },

    emailVerificationLastSentAt: {
      type: Date,
      default: undefined,
    },

    // =====================================================
    // PASSWORD RESET
    // =====================================================
    passwordResetToken: {
      type: String,
      default: undefined,
    },

    passwordResetExpires: {
      type: Date,
      default: undefined,
    },

    passwordResetLastSentAt: {
      type: Date,
      default: undefined,
    },

    // =====================================================
    // EMAIL DELIVERY AND TRACKING
    // =====================================================
    emailDelivery: {
      provider: {
        type: String,
        enum: ["brevo-primary", "brevo-fallback"],
      },

      messageId: {
        type: String,
      },

      type: {
        type: String,
        enum: [
          "registration",
          "email_verification",
          "password_reset",
          "transactional",
        ],
      },

      status: {
        type: String,
        enum: [
          "sent",
          "delivered",
          "delayed",
          "opened",
          "clicked",
          "bounced",
          "failed",
        ],
      },

      sentAt: {
        type: Date,
      },

      deliveredAt: {
        type: Date,
      },

      delayedAt: {
        type: Date,
      },

      openedAt: {
        type: Date,
      },

      clickedAt: {
        type: Date,
      },

      bouncedAt: {
        type: Date,
      },

      failedAt: {
        type: Date,
      },

      blockedAt: {
        type: Date,
      },

      spamAt: {
        type: Date,
      },

      error: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// =======================================================
// CREATE PASSWORD RESET TOKEN
// =======================================================
userSchema.methods.createPasswordResetToken = function () {
  // Generate the raw token that will be sent by email
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Store only the hashed token in the database
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Token expires after 10 minutes
  this.passwordResetExpires = new Date(
    Date.now() + 10 * 60 * 1000
  );

  // Return the unhashed token for the reset URL
  return resetToken;
};

// =======================================================
// CREATE EMAIL VERIFICATION TOKEN
// =======================================================
userSchema.methods.createEmailVerificationToken = function () {
  // Generate the raw verification token
  const token = crypto.randomBytes(32).toString("hex");

  // Store only the hashed token in the database
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Token expires after 10 minutes
  this.emailVerificationExpires = new Date(
    Date.now() + 10 * 60 * 1000
  );

  // Return the unhashed token for the verification URL
  return token;
};

module.exports = mongoose.model("User", userSchema);
