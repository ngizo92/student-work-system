const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');

// file upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

/* ================= CREATE TASK ================= */
router.post('/upload', upload.single('file'), (req, res) => {

    const { title, description, teacher_id } = req.body;
    const file = req.file ? req.file.filename : null;

    if (!title || !teacher_id) {
        return res.json({
            success: false,
            message: "Title and teacher required"
        });
    }

    db.query(
        `INSERT INTO tasks (title, description, teacher_id, file_path)
         VALUES (?, ?, ?, ?)`,
        [title, description, teacher_id, file],
        (err) => {

            if (err) {
                console.log("TASK ERROR:", err);
                return res.json({
                    success: false,
                    message: "Database error while saving task"
                });
            }

            return res.json({
                success: true,
                message: "Task assigned successfully"
            });
        }
    );
});

/* ================= GET TASKS ================= */
router.get('/', (req, res) => {

    db.query("SELECT * FROM tasks ORDER BY id DESC", (err, result) => {

        if (err) {
            return res.json({
                success: false,
                message: "DB error"
            });
        }

        res.json(result);
    });
});

module.exports = router;