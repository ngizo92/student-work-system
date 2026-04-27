const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// ONLY TEACHER CAN ACCESS
router.get("/students", auth, (req, res) => {
  if (!req.user || req.user.role !== "teacher") {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json({ message: "Teacher access granted" });
});

module.exports = router;