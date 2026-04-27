const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/* ================= REGISTER TEACHER ================= */
exports.register = (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.json({ success: false, message: "All fields required" });
    }

    db.query("SELECT * FROM teachers WHERE email = ?", [email], (err, result) => {

        if (err) return res.json({ success: false, message: "DB error" });

        if (result.length > 0) {
            return res.json({ success: false, message: "Teacher already exists" });
        }

        const hash = bcrypt.hashSync(password, 10);

        db.query(
            "INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)",
            [name, email, hash],
            (err2) => {
                if (err2) return res.json({ success: false, message: "Error creating teacher" });

                res.json({ success: true, message: "Teacher created successfully" });
            }
        );
    });
};

/* ================= LOGIN TEACHER (FIXED JWT) ================= */
exports.login = (req, res) => {

    const { email, password } = req.body;

    db.query("SELECT * FROM teachers WHERE email = ?", [email], (err, result) => {

        if (err) return res.json({ success: false, message: "DB error" });

        if (result.length === 0) {
            return res.json({ success: false, message: "Teacher not found" });
        }

        const teacher = result[0];

        const match = bcrypt.compareSync(password, teacher.password);

        if (!match) {
            return res.json({ success: false, message: "Wrong password" });
        }

        // ✅ CREATE TOKEN (THIS WAS MISSING)
        const token = jwt.sign(
            { id: teacher.id, role: "teacher" },
            "secretkey",
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            token,
            teacher: {
                id: teacher.id,
                name: teacher.name,
                email: teacher.email
            }
        });
    });
};