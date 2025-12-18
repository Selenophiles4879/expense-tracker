const jwt = require("jsonwebtoken");
const User = require("../model/User");

const isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1️⃣ Check token exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Fetch user from DB
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 4️⃣ Check email verification
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    // 5️⃣ Attach user to request
    req.user = { id: user._id };

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token expired or invalid, please login again" });
  }
};

module.exports = isAuthenticated;
