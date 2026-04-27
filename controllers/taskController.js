const db = require('../config/db');

// CREATE TASK
exports.createTask = (req, res) => {
    const { title, description, teacher_id } = req.body;
    const file = req.file ? req.file.filename : null;

    const sql = `
        INSERT INTO tasks (title, description, teacher_id, file_path)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [title, description, teacher_id, file], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Task created' });
    });
};

// GET TASKS
exports.getTasks = (req, res) => {
    const sql = `
        SELECT t.*, te.id AS teacher
        FROM tasks t
        JOIN teachers te ON t.teacher_id = te.id
        ORDER BY t.id DESC
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).send(err);
        res.json(result);
    });
};