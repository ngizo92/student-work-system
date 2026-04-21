const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const verifyToken = require("../middleware/auth");

/* ================= FILE UPLOAD CONFIG ================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

/* ================= GET ALL TASKS ================= */
router.get("/tasks", (req, res) => {

    db.query("SELECT * FROM tasks ORDER BY id DESC", (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "DB error loading tasks"
            });
        }

        res.json(result);
    });
});

/* ================= CREATE TASK (TEACHER ONLY) ================= */
router.post("/tasks", verifyToken, upload.single("file"), (req, res) => {

    try {

        // 🔐 ROLE CHECK
        if (!req.user || req.user.role !== "teacher") {
            return res.json({
                success: false,
                message: "Only teacher allowed"
            });
        }

        const { title, description, class: className, subject, student_id } = req.body;

        const filePath = req.file ? req.file.filename : null;

        db.query(
            "INSERT INTO tasks (title, description, class, subject, file_path, student_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [title, description, className, subject, filePath, student_id || null],
            (err) => {

                if (err) {
                    console.log(err);
                    return res.json({
                        success: false,
                        message: "DB insert failed"
                    });
                }

                res.json({
                    success: true,
                    message: "Task added successfully"
                });
            }
        );

    } catch (error) {
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

/* ================= STUDENT SUBMIT WORK ================= */
router.post("/submit", upload.single("file"), (req, res) => {

    const { student, task_id } = req.body;

    if (!req.file) {
        return res.json({
            success: false,
            message: "No file submitted"
        });
    }

    const file = req.file.filename;

    db.query(
        "INSERT INTO submissions (student_id, task_id, file) VALUES (?, ?, ?)",
        [student, task_id, file],
        (err) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "Submission failed"
                });
            }

            res.json({
                success: true,
                message: "Submitted successfully"
            });
        }
    );
});

module.exports = router;