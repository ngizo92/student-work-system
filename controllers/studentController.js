const db = require('../config/db');

/* ================= CREATE STUDENT ================= */
const createStudent = (req, res) => {
    const { name, email, className, password } = req.body;

    const sql = `
        INSERT INTO students (name, email, class, password)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [name, email, className, password], (err) => {
        if (err) return res.status(500).json({ message: err.message });

        res.json({ message: "Student created successfully" });
    });
};

/* ================= GET ALL STUDENTS ================= */
const getStudents = (req, res) => {
    db.query("SELECT * FROM students", (err, result) => {
        if (err) return res.status(500).json({ message: err.message });

        res.json(result);
    });
};

module.exports = {
    createStudent,
    getStudents
};