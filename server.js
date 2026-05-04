const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("./config/db");
console.log("🔥 SERVER STARTED FROM THIS FILE");
const app = express();
const PORT = process.env.PORT || 5000;

// ================= JWT =================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET missing");
  process.exit(1);
}

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// ================= MULTER (SINGLE CLEAN VERSION) =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// ================= AUTH =================
function auth(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ success: false, msg: "No token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, msg: "Invalid token" });
  }
}

// ================= TEACHER LOGIN =================
app.post("/teacher-login", (req, res) => {
  let { email, password } = req.body;

  email = email?.trim().toLowerCase();

  db.query("SELECT * FROM teachers WHERE email = ?", [email], async (err, rows) => {
    if (err || rows.length === 0)
      return res.json({ success: false, msg: "Invalid credentials" });

    const teacher = rows[0];
    const ok = await bcrypt.compare(password, teacher.password);

    if (!ok) return res.json({ success: false, msg: "Wrong password" });

    const token = jwt.sign({ id: teacher.id, role: "teacher" }, JWT_SECRET);

    res.json({ success: true, token, teacher });
  });
});

// ================= CREATE TASK =================
app.post("/tasks", auth, upload.single("file"), (req, res) => {

  const { title, description, class: className, subject, priority, deadline } = req.body;
  const teacher_id = req.user.id;

  const file_name = req.file?.originalname || null;
  const file_path = req.file?.filename || null;

  db.query(
    `INSERT INTO tasks 
    (title, description, class, subject, priority, deadline, file_name, file_path, teacher_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [title, description, className, subject, priority, deadline, file_name, file_path, teacher_id],
    (err, result) => {

      if (err) return res.json({ success: false, msg: "Task error" });

      const taskId = result.insertId;

      db.query(
        `INSERT INTO assignments 
        (task_id, title, description, class, subject, file_name, file_path, deadline, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [taskId, title, description, className, subject, file_name, file_path, deadline],
        (err2) => {
          if (err2) return res.json({ success: false, msg: "Assignment error" });

          res.json({ success: true, msg: "Task created" });
        }
      );
    }
  );
});

// ================= GET ASSIGNMENTS =================
app.get("/assignments", (req, res) => {
  db.query("SELECT * FROM assignments ORDER BY id DESC", (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

// ================= SUBMIT TASK =================
app.post("/submit-task", auth, upload.single("file"), (req, res) => {

  const { task_id, answer } = req.body;
  const student_id = req.user.id;
  const file_path = req.file?.filename || null;

  db.query(
    "SELECT deadline FROM assignments WHERE task_id = ?",
    [task_id],
    (err, rows) => {

      if (err || rows.length === 0) {
        return res.json({ success: false, msg: "Task not found" });
      }

      const deadline = rows[0].deadline ? new Date(rows[0].deadline) : null;

      if (deadline && new Date() > deadline) {
        return res.json({ success: false, msg: "Deadline passed" });
      }

      db.query(
        `INSERT INTO submissions (task_id, student_id, answer, file_path)
         VALUES (?, ?, ?, ?)`,
        [task_id, student_id, answer, file_path],
        (err2) => {
          if (err2) return res.json({ success: false });

          res.json({ success: true, msg: "Submitted successfully" });
        }
      );
    }
  );
});

// ================= STUDENT LOGIN =================
app.post("/student-login", (req, res) => {
  let { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false });

  email = email.trim().toLowerCase();

  db.query("SELECT * FROM students WHERE email = ?", [email], async (err, rows) => {
    if (err || rows.length === 0)
      return res.json({ success: false });

    const student = rows[0];
    const match = await bcrypt.compare(password, student.password);

    if (!match) return res.json({ success: false });

    const token = jwt.sign({ id: student.id, role: "student" }, JWT_SECRET);

    res.json({ success: true, token, student });
  });
});

// ================= CREATE STUDENT =================
app.post("/teacherStudent/create-student", auth, (req, res) => {

  let { name, email, class: className, subject, password } = req.body;

  email = email?.trim().toLowerCase();

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.json({ success: false });

    db.query(
      "INSERT INTO students (name, email, `class`, subject, password) VALUES (?, ?, ?, ?, ?)",
      [name, email, className, subject, hash],
      (err2) => {
        if (err2) return res.json({ success: false });

        res.json({ success: true });
      }
    );
  });
});

app.delete("/students/:id", auth, (req, res) => {

    const id = req.params.id;

    db.query("DELETE FROM students WHERE id = ?", [id], (err) => {

        if (err) {
            console.error(err);
            return res.json({ success: false, msg: "Delete failed" });
        }

        res.json({ success: true, msg: "Student deleted" });
    });
});

// ================= GRADE =================
app.post("/grade-submission", auth, (req, res) => {

  const { submission_id, marks, feedback } = req.body;

  db.query(
    "UPDATE submissions SET marks = ?, feedback = ? WHERE id = ?",
    [marks, feedback, submission_id],
    (err) => {
      if (err) return res.json({ success: false });

      res.json({ success: true });
    }
  );
});

// ================= STUDENT VIEW TASKS =================
app.get("/student-submissions", auth, (req, res) => {

  const student_id = req.user.id;

  const sql = `
    SELECT 
      tasks.id,
      submissions.id AS submission_id,
      tasks.title,
      tasks.description,
      tasks.file_path,
      tasks.deadline,
      submissions.marks,
      submissions.feedback
    FROM tasks
    LEFT JOIN submissions 
      ON tasks.id = submissions.task_id 
      AND submissions.student_id = ?
    ORDER BY tasks.id DESC
  `;

  db.query(sql, [student_id], (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

// ================= LEADERBOARD FIXED =================
app.get("/leaderboard", (req, res) => {

  const sql = `
    SELECT 
      s.id,
      s.name,
      COALESCE(SUM(sub.marks), 0) AS total_marks
    FROM students s
    LEFT JOIN submissions sub ON s.id = sub.student_id
    GROUP BY s.id, s.name
    ORDER BY total_marks DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json([]);

    res.json(rows);
  });
});

// ================= TEACHER VIEW SUBMISSIONS =================
app.get("/submissions-view", (req, res) => {

  const sql = `
    SELECT 
      submissions.id,
      submissions.answer,
      submissions.file_path,
      submissions.marks,
      submissions.feedback,
      submissions.created_at,
      tasks.title AS task_title,
      students.name AS student_name
    FROM submissions
    JOIN tasks ON submissions.task_id = tasks.id
    JOIN students ON submissions.student_id = students.id
    ORDER BY submissions.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }

    res.json(rows);
  });
});

// ================= GET STUDENTS =================
app.get("/students", auth, (req, res) => {

  db.query("SELECT id, name, email, class, subject FROM students ORDER BY id DESC",
    (err, rows) => {

      if (err) {
        console.error(err);
        return res.json([]);
      }

      res.json(rows);
    }
  );
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});