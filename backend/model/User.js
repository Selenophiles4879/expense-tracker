const mongoose = require("mongoose");
const crypto = require("crypto");

const emailDeliverySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["brevo-primary", "brevo-fallback"],
    },
    messageId: String,
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
    sentAt: Date,
    deliveredAt: Date,
    delayedAt: Date,
    openedAt: Date,
    clickedAt: Date,
    bouncedAt: Date,
    failedAt: Date,
    blockedAt: Date,
    spamAt: Date,
    error: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
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

    // Latest delivery status for each email category.
    // Registration and verification use email_verification.
    emailDelivery: {
      email_verification: {
        type: emailDeliverySchema,
        default: undefined,
      },
      password_reset: {
        type: emailDeliverySchema,
        default: undefined,
      },
      transactional: {
        type: emailDeliverySchema,
        default: undefined,
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  this.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

  return token;
};

module.exports = mongoose.model("User", userSchema);
