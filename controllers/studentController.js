const db = require('../config/db');

exports.getStudents = (req, res) => {
    db.query('SELECT * FROM students', (err, result) => {
        if (err) return res.status(500).send(err);
        res.json(result);
    });
};