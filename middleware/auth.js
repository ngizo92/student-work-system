const jwt = require("jsonwebtoken");

const SECRET = "secretkey";

// ================= AUTH MIDDLEWARE =================
function auth(req, res, next) {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET);

    req.user = decoded; // user data inside token
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ================= ROLE CHECK MIDDLEWARE =================
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden: insufficient rights" });
    }
    next();
  };
}

module.exports = { auth, requireRole };