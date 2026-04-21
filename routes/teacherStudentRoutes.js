const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const verifyToken = require("../middleware/auth");

/* ================= CREATE STUDENT (TEACHER ONLY) ================= */
router.post("/create-student", verifyToken, async (req, res) => {

    // 🔐 ROLE CHECK
    if (req.user.role !== "teacher") {
        return res.json({
            success: false,
            message: "Only teachers can create students"
        });
    }

    const { name, email, class: className, password } = req.body;

    // ✅ VALIDATION
    if (!name || !email || !className || !password) {
        return res.json({
            success: false,
            message: "Fill all fields"
        });
    }

    // 🔍 CHECK IF STUDENT EXISTS
    db.query(
        "SELECT * FROM students WHERE email = ?",
        [email],
        async (err, result) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "DB error"
                });
            }

            if (result.length > 0) {
                return res.json({
                    success: false,
                    message: "Student already exists"
                });
            }

            try {
                // 🔐 HASH PASSWORD
                const hashed = await bcrypt.hash(password, 10);

                // 💾 INSERT INTO DB
                db.query(
                    "INSERT INTO students (name, email, class, password) VALUES (?, ?, ?, ?)",
                    [name, email, className, hashed],
                    (err2) => {

                        if (err2) {
                            return res.json({
                                success: false,
                                message: err2.message
                            });
                        }

                        return res.json({
                            success: true,
                            message: "Student created successfully"
                        });
                    }
                );

            } catch (error) {
                return res.json({
                    success: false,
                    message: "Server error"
                });
            }
        }
    );
});


/* ================= GET ALL STUDENTS ================= */
router.get("/students", (req, res) => {

    db.query("SELECT * FROM students", (err, result) => {

        if (err) {
            return res.json({ success: false, message: "DB error" });
        }

        res.json(result);
    });
});


/* ================= DELETE STUDENT ================= */
router.delete("/student/:id", (req, res) => {

    db.query(
        "DELETE FROM students WHERE id = ?",
        [req.params.id],
        (err) => {

            if (err) {
                return res.json({ success: false, message: "DB error" });
            }

            res.json({
                success: true,
                message: "Student deleted"
            });
        }
    );
});


module.exports = router;