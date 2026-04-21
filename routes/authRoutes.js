const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = "student-system-secret-key";

/* ================= TEACHER REGISTER ================= */
router.post("/teacher/register", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: "Fill all fields" });
    }

    db.query(
        "SELECT * FROM teachers WHERE email = ?",
        [email],
        async (err, result) => {

            if (err) return res.json({ success: false, message: "DB error" });

            if (result.length > 0) {
                return res.json({ success: false, message: "Teacher already exists" });
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);

                db.query(
                    "INSERT INTO teachers (email, password) VALUES (?, ?)",
                    [email, hashedPassword],
                    (err2) => {

                        if (err2) {
                            return res.json({ success: false, message: err2.message });
                        }

                        return res.json({
                            success: true,
                            message: "Teacher account created successfully"
                        });
                    }
                );

            } catch (error) {
                return res.json({ success: false, message: "Hashing error" });
            }
        }
    );
});


/* ================= TEACHER LOGIN ================= */
router.post("/teacher/login", (req, res) => {

    const { email, password } = req.body;

    db.query(
        "SELECT * FROM teachers WHERE email = ?",
        [email],
        async (err, result) => {

            if (err) return res.json({ success: false, message: "DB error" });

            if (result.length === 0)
                return res.json({ success: false, message: "Teacher not found" });

            const teacher = result[0];

            const match = await bcrypt.compare(password, teacher.password);

            if (!match)
                return res.json({ success: false, message: "Invalid credentials" });

            const token = jwt.sign(
                { id: teacher.id, role: "teacher" },
                SECRET,
                { expiresIn: "2h" }
            );

            res.json({
                success: true,
                role: "teacher",
                token,
                teacher
            });
        }
    );
});


/* ================= STUDENT LOGIN ================= */
router.post("/student/login", (req, res) => {

    const { email, password } = req.body;

    db.query(
        "SELECT * FROM students WHERE email = ?",
        [email],
        async (err, result) => {

            if (err) return res.json({ success: false, message: "DB error" });

            if (result.length === 0)
                return res.json({ success: false, message: "Student not found" });

            const student = result[0];

            const match = await bcrypt.compare(password, student.password);

            if (!match)
                return res.json({ success: false, message: "Invalid credentials" });

            const token = jwt.sign(
                { id: student.id, role: "student" },
                SECRET,
                { expiresIn: "2h" }
            );

            res.json({
                success: true,
                role: "student",
                token,
                student
            });
        }
    );
});


module.exports = router;