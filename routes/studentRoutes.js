const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");

/* ================= GET ALL STUDENTS ================= */
router.get("/", (req, res) => {
    db.query("SELECT * FROM students", (err, result) => {
        if (err) return res.json({ success: false });
        res.json(result);
    });
});

/* ================= CREATE STUDENT ================= */
router.post("/", async (req, res) => {
    const { name, email, class: className, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    db.query(
        "INSERT INTO students (name, email, class, password) VALUES (?, ?, ?, ?)",
        [name, email, className, hashed],
        (err) => {
            if (err)
                return res.json({ success: false, message: err.message });

            res.json({ success: true, message: "Student created" });
        }
    );
});

/* ================= DELETE STUDENT ================= */
router.delete("/:id", (req, res) => {
    db.query(
        "DELETE FROM students WHERE id=?",
        [req.params.id],
        (err) => {
            if (err) return res.json({ success: false });

            res.json({ success: true, message: "Student deleted" });
        }
    );
});

module.exports = router;