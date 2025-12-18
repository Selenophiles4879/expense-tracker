const jwt = require("jsonwebtoken");

const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

const user = await User.findById(decoded.id);
if (!user.isEmailVerified) {
  return res.status(403).json({ message: "Email not verified" });
}
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "masynctechKey");

    // FIX: Store user as an object
    req.user = { id: decoded.id };

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token expired or invalid, please login again" });
  }
};

module.exports = isAuthenticated;
