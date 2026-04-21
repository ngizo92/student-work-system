const db = require('../config/db');

/* ================= TEACHER REGISTER ================= */
const registerTeacher = (req, res) => {
    const { email, password } = req.body;

    db.query(
        "INSERT INTO teachers (email, password) VALUES (?, ?)",
        [email, password],
        (err) => {
            if (err) return res.status(500).json({ message: err.message });

            res.json({ message: "Account created successfully" });
        }
    );
};

/* ================= TEACHER LOGIN ================= */
const loginTeacher = (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT * FROM teachers WHERE email=? AND password=?",
        [email, password],
        (err, result) => {

            if (err) {
                return res.status(500).json({ message: "DB error" });
            }

            if (result.length === 0) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            // ✅ IMPORTANT FIX
            res.json({
                message: "Login successful",
                teacher: result[0]
            });
        }
    );
};

module.exports = { registerTeacher, loginTeacher };