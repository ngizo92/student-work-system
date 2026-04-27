const express = require('express');
const router = express.Router();
const db = require('../config/db');

/* ================= GET ALL STUDENTS ================= */
router.get('/', (req, res) => {

    db.query('SELECT * FROM students', (err, result) => {

        if (err) {
            return res.json({
                success: false,
                message: "Database error"
            });
        }

        res.json(result);
    });

});

module.exports = router;