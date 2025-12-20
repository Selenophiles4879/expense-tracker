// middleware/emailVerifiedOnly.js
const User = require("../model/User");

const emailVerifiedOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email to access this feature",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Verification check failed" });
  }
};

module.exports = emailVerifiedOnly;
