const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "student_task_system"
});

db.connect(err => {
    if (err) console.log("DB Error:", err.message);
    else console.log("MySQL Connected");
});

module.exports = db;