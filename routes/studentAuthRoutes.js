const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db"); // your mysql connection file

// REGISTER STUDENT
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const [existing] = await db.promise().query(
      "SELECT * FROM students WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Student already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.promise().query(
      "INSERT INTO students (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, "student"]
    );

    res.json({ message: "Student created successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN STUDENT
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM students WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const student = rows[0];

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: student.id, role: student.role },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: student.id,
        name: student.name,
        role: student.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;