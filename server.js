const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// ================= JWT =================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET missing");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// ================= MULTER =================
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

// ================= TEACHER LOGIN (FIXED) =================
app.post("/teacher-login", (req, res) => {
  let { email, password } = req.body;

  email = email.trim().toLowerCase(); // 🔥 FIX

  db.query("SELECT * FROM teachers WHERE email = ?", [email], async (err, rows) => {
    if (err) return res.json({ success: false });

    if (rows.length === 0) return res.json({ success: false, msg: "Not found" });

    const teacher = rows[0];
    const ok = await bcrypt.compare(password, teacher.password);

    if (!ok) return res.json({ success: false, msg: "Wrong password" });

    const token = jwt.sign({ id: teacher.id, role: "teacher" }, JWT_SECRET);

    res.json({ success: true, token, teacher });
  });
});

// ================= TASKS =================
app.post("/tasks", auth, upload.single("file"), (req, res) => {

  const { title, description, class: className, subject } = req.body;

  const teacher_id = req.user.id; // ✅ correct source

  const file_name = req.file ? req.file.originalname : null;
  const file_path = req.file ? req.file.filename : null;

  db.query(
    `INSERT INTO tasks 
    (title, description, class, subject, file_name, file_path, teacher_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,

    [title, description, className, subject, file_name, file_path, teacher_id],

    (err, result) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }

      const taskId = result.insertId;

      db.query(
        `INSERT INTO assignments 
        (task_id, title, description, class, subject, file_name, file_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [taskId, title, description, className, subject, file_name, file_path],

        (err2) => {
          if (err2) {
            console.error(err2);
            return res.json({ success: false });
          }

          res.json({ success: true, msg: "Task created successfully" });
        }
      );
    }
  );
});

// ================= GET TASKS =================
app.get("/tasks", (req, res) => {
  db.query("SELECT * FROM tasks ORDER BY id DESC", (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

// ================= GET ASSIGNMENTS =================
app.get("/assignments", (req, res) => {
  db.query("SELECT * FROM assignments ORDER BY id DESC", (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

// ================= SUBMISSIONS =================
app.get("/submissions-view", (req, res) => {

  const sql = `
    SELECT 
      submissions.id,
      submissions.answer,
      submissions.file_path,
      submissions.created_at,
      tasks.title AS task_title,
      students.name AS student_name
    FROM submissions
    LEFT JOIN tasks ON submissions.task_id = tasks.id
    LEFT JOIN students ON submissions.student_id = students.id
    ORDER BY submissions.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("SUBMISSION FETCH ERROR:", err);
      return res.status(500).json([]);
    }

    console.log("SUBMISSIONS FOUND:", results); // 🔥 IMPORTANT DEBUG

    res.json(results);
  });
});
// ================= SUBMIT TASK =================
const submissionUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
  })
});

app.post("/submit-task", auth, submissionUpload.single("file"), (req, res) => {
  const { task_id, answer } = req.body;
  const student_id = req.user.id;

  const file_path = req.file ? req.file.filename : null;

  db.query(
    `INSERT INTO submissions (task_id, student_id, answer, file_path)
     VALUES (?, ?, ?, ?)`,
    [task_id, student_id, answer, file_path],
    (err) => {
      if (err) return res.json({ success: false });

      res.json({ success: true, msg: "Submitted successfully" });
    }
  );
});

// ================= STUDENT LOGIN (FIXED) =================
app.post("/student-login", (req, res) => {
  let { email, password } = req.body;

  // ✅ SAFE CHECK (prevents crash)
  if (!email || !password) {
    return res.status(400).json({ success: false, msg: "Missing email or password" });
  }

  email = email.trim().toLowerCase();

  db.query(
    "SELECT * FROM students WHERE email = ?",
    [email],
    async (err, rows) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, msg: "DB error" });
      }

      if (rows.length === 0) {
        return res.json({ success: false, msg: "Student not found" });
      }

      const student = rows[0];

      const match = await bcrypt.compare(password, student.password);

      if (!match) {
        return res.json({ success: false, msg: "Wrong password" });
      }

      const token = jwt.sign(
        { id: student.id, role: "student" },
        process.env.JWT_SECRET
      );

      res.json({
        success: true,
        token,
        student
      });
    }
  );
});
// ================= CREATE STUDENT (FIXED) =================
app.post("/teacherStudent/create-student", auth, (req, res) => {

  let { name, email, class: className, subject, password } = req.body;

  email = email.trim().toLowerCase();

  if (!name || !email || !password) {
    return res.json({ success: false, msg: "Missing fields" });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error(err);
      return res.json({ success: false });
    }

    db.query(
      "INSERT INTO students (name, email, `class`, subject, password) VALUES (?, ?, ?, ?, ?)",
      [name, email, className, subject, hash],
      (err, result) => {

        if (err) {
          console.error(err);
          return res.json({ success: false, msg: err.sqlMessage });
        }

        res.json({ success: true, msg: "Student created" });
      }
    );
  });

});

// ================= CREATE TEACHER =================
app.post("/create-teacher", async (req, res) => {
  let { name, email, password } = req.body;

  email = email.trim().toLowerCase();

  if (!name || !email || !password) {
    return res.json({ success: false, msg: "Missing fields" });
  }

  try {
    // ✅ CHECK DUPLICATE
    db.query("SELECT * FROM teachers WHERE email = ?", [email], async (err, rows) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }

      if (rows.length > 0) {
        return res.json({ success: false, msg: "Teacher already exists" });
      }

      // ✅ HASH PASSWORD
      const hash = await bcrypt.hash(password, 10);

      db.query(
        "INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)",
        [name, email, hash],
        (err, result) => {

          if (err) {
            console.error(err);
            return res.json({ success: false });
          }

          // ✅ AUTO LOGIN TOKEN
          const token = jwt.sign(
            { id: result.insertId, role: "teacher" },
            process.env.JWT_SECRET
          );

          const teacher = {
            id: result.insertId,
            name,
            email
          };

          res.json({
            success: true,
            msg: "Teacher created successfully",
            token,
            teacher
          });
        }
      );
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});



// ================= START =================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});