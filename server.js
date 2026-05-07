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
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
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

  db.query(
    "SELECT * FROM teachers WHERE email = ?",
    [email],
    async (err, rows) => {
      if (err || rows.length === 0)
        return res.json({ success: false, msg: "Invalid credentials" });

      const teacher = rows[0];
      const ok = await bcrypt.compare(password, teacher.password);

      if (!ok) return res.json({ success: false, msg: "Wrong password" });

      const token = jwt.sign({ id: teacher.id, role: "teacher" }, JWT_SECRET);

      res.json({ success: true, token, teacher });
    },
  );
});

app.post("/create-teacher", (req, res) => {
  console.log("CREATE TEACHER HIT:", req.body);

  let { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, msg: "Missing fields" });
  }

  email = email.trim().toLowerCase();

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.json({ success: false });

    db.query(
      "INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)",
      [name, email, hash],
      (err2) => {
        if (err2) {
          console.log("🔥 FULL DB ERROR:", err2.sqlMessage || err2);
          return res.json({
            success: false,
            msg: err2.sqlMessage || "DB insert failed",
          });
        }
        res.json({ success: true, msg: "Teacher created successfully" });
      },
    );
  });
});

// ================= CREATE TASK =================
app.post("/tasks", auth, upload.single("file"), (req, res) => {

  const {
    title,
    description,
    class: className,
    subject,
    priority,
    deadline
  } = req.body;

  const teacher_id = req.user.id;

  const file_name = req.file?.originalname || null;
  const file_path = req.file?.filename || null;

  db.query(
    `INSERT INTO tasks 
    (title, description, class, subject, priority, deadline, file_name, file_path, teacher_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      title,
      description,
      className,
      subject,
      priority,
      deadline,
      file_name,
      file_path,
      teacher_id
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.json({ success: false, msg: "Task error" });
      }

      const taskId = result.insertId;

      db.query(
        `INSERT INTO assignments 
        (task_id, title, description, class, subject, file_name, file_path, deadline, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
       [
  taskId,
  title,
  description,
  className,
  subject,
  file_name,
  file_path,
  deadline
],
        (err2) => {
          if (err2) {
            console.log(err2);
            return res.json({ success: false, msg: "Assignment error" });
          }

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

// ================

// ================= SUBMIT TASK =================
app.post("/submit-task", auth, upload.single("file"), (req, res) => {

  const { task_id, answer } = req.body;
  const student_id = req.user.id;
  const file_path = req.file?.filename || null;

  // ✅ FIX: use assignments.id (NOT task_id lookup confusion)
  db.query(
    "SELECT deadline FROM assignments WHERE id = ?",
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
          if (err2) {
            console.log(err2);
            return res.json({ success: false, msg: "Submit failed" });
          }

          res.json({ success: true, msg: "Submitted successfully" });
        }
      );
    }
  );
});

// ================= STUDENT LOGIN =================
app.post("/student-login", (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ success: false });

  email = email.trim().toLowerCase();

  db.query(
    "SELECT * FROM students WHERE email = ?",
    [email],
    async (err, rows) => {
      if (err || rows.length === 0) return res.json({ success: false });

      const student = rows[0];
      const match = await bcrypt.compare(password, student.password);

      if (!match) return res.json({ success: false });

      const token = jwt.sign({ id: student.id, role: "student" }, JWT_SECRET);

      res.json({ success: true, token, student });
    },
  );
});

// ================= CREATE STUDENT =================
app.post("/teacherStudent/create-student", auth, (req, res) => {
  let { name, email, class: className, subject, password } = req.body;

console.log("🔥 CLASS VALUE:", className);

  console.log("CREATE STUDENT BODY:", req.body);

  email = email?.trim().toLowerCase();

  if (!name || !email || !password || !className) {
  return res.json({ success: false, msg: "Missing fields" });
}

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.log("HASH ERROR:", err);
      return res.json({ success: false, msg: "Hash error" });
    }

    const sql = `
  INSERT INTO students (name, email, class, subject, password)
  VALUES (?, ?, ?, ?, ?)
`;
    db.query(sql, [name, email, className, subject, hash], (err2) => {
      if (err2) {
        console.log("🔥 FULL DB ERROR:", err2.sqlMessage || err2); // 🔥 IMPORTANT
        return res.json({ success: false, msg: "DB insert failed" });
      }

      return res.json({ success: true, msg: "Student created" });
    });
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
    `
      UPDATE submissions
      SET marks = ?, feedback = ?
      WHERE id = ?
    `,
    [marks, feedback, submission_id],
    (err) => {

      if (err) {
        console.log(err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        msg: "Marked successfully"
      });

    }
  );

});

// ================= STUDENT VIEW TASKS =================
app.get("/student-submissions", auth, (req, res) => {

  const student_id = req.user.id;

  const sql = `
    SELECT 
      a.id,
      a.title,
      a.description,
      a.file_path,
      a.deadline,
      s.id AS submission_id,
      s.task_id,
      s.marks,
      s.feedback
    FROM assignments a
    LEFT JOIN submissions s 
      ON s.task_id = a.id 
      AND s.student_id = ?
    ORDER BY a.id DESC
  `;

  db.query(sql, [student_id], (err, results) => {

    if (err) {
      console.log("JOIN ERROR:", err);
      return res.json([]);
    }

    console.log("JOIN OUTPUT:", results); // DEBUG

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
// ================= TEACHER VIEW SUBMISSIONS =================
app.get("/submissions-view", auth, (req, res) => {

  const sql = `
    SELECT 
      submissions.id,
      submissions.answer,
      submissions.file_path,
      submissions.marks,
      submissions.feedback,
      submissions.created_at,

      assignments.title AS task_title,
      students.name AS student_name

    FROM submissions

    LEFT JOIN assignments 
      ON submissions.task_id = assignments.id

    LEFT JOIN students 
      ON submissions.student_id = students.id

    ORDER BY submissions.created_at DESC
  `;

  db.query(sql, (err, rows) => {

    if (err) {
      console.log(err);
      return res.json([]);
    }

    res.json(rows);

  });

});

// ================= GET STUDENTS =================
// ================= GET STUDENTS =================
app.get("/students", auth, (req, res) => {

  console.log("🔥 STUDENTS ROUTE HIT");

  const sql = `
    SELECT 
      id,
      name,
      email,
      class,
      subject
    FROM students
    ORDER BY id DESC
  `;

  db.query(sql, (err, rows) => {

    if (err) {
      console.error(err);
      return res.status(500).json([]);
    }

    res.json(rows);

  });

});
app.post("/dos-login", (req, res) => {
  let { email, password } = req.body;

  email = email?.trim().toLowerCase();

  db.query("SELECT * FROM dos WHERE email = ?", [email], async (err, rows) => {
    if (err || rows.length === 0)
      return res.json({ success: false, msg: "Invalid credentials" });

    const dos = rows[0];
    const ok = await bcrypt.compare(password, dos.password);

    if (!ok) return res.json({ success: false, msg: "Wrong password" });

    const token = jwt.sign({ id: dos.id, role: "dos" }, JWT_SECRET);

    res.json({ success: true, token, dos });
  });
});

// ================= TEACHER ONLY STUDENTS =================
app.get("/teacher/students", auth, (req, res) => {

  if (req.user.role !== "teacher") {
    return res.status(403).json({ success: false, msg: "Only teachers allowed" });
  }

  const teacherId = req.user.id;

  const sql = `
    SELECT 
      s.id,
      s.name,
      s.email,
      s.class_id,
      s.subject
    FROM students s
    JOIN teacher_classes tc ON s.class_id = tc.class_id
    WHERE tc.teacher_id = ?
    ORDER BY s.id DESC
  `;

  db.query(sql, [teacherId], (err, rows) => {
    if (err) {
      console.log(err);
      return res.json([]);
    }

    res.json(rows);
  });
});

app.post("/dos/create-class", auth, (req, res) => {
  console.log("DOS USER:", req.user);
  console.log("CREATE CLASS BODY:", req.body);

  if (req.user.role !== "dos") {
    return res.status(403).json({ success: false, msg: "Only DOS allowed" });
  }

  const { name, level, description } = req.body;

  db.query(
    "INSERT INTO classes (name, level, description) VALUES (?, ?, ?)",
    [name, level, description],
    (err) => {
      if (err) {
        return res.json({ success: false, msg: "Error creating class" });
      }

      res.json({ success: true, msg: "Class created successfully" });
    },
  );
});

// ================= GET CLASSES =================
app.get("/classes", auth, (req, res) => {
  db.query("SELECT * FROM classes ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }

    res.json(rows);
  });
});

app.post("/dos-register", (req, res) => {
  let { name, email, password } = req.body;

  email = email?.trim().toLowerCase();

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.json({ success: false, msg: "Error" });

    db.query(
      "INSERT INTO dos (name, email, password) VALUES (?, ?, ?)",
      [name, email, hash],
      (err2) => {
        if (err2)
          return res.json({
            success: false,
            msg: "DOS already exists or error",
          });

        res.json({ success: true, msg: "DOS account created" });
      },
    );
  });
});

// ================= GET TEACHERS =================
app.get("/teachers", auth, (req, res) => {
  db.query("SELECT id, name, email FROM teachers", (err, rows) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }

    res.json(rows);
  });
});
app.post("/dos/assign-class", auth, (req, res) => {
  const { student_id, class_id } = req.body;

  db.query(
    "UPDATE students SET class_id = ? WHERE id = ?",
    [class_id, student_id],
    (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false, msg: "Assignment failed" });
      }

      res.json({ success: true, msg: "Class assigned successfully" });
    },
  );
});

app.post("/dos/assign-student-class", auth, (req, res) => {

  if (req.user.role !== "dos") {
    return res.status(403).json({ success: false, msg: "Only DOS allowed" });
  }

  const { student_id, class_id } = req.body;

  db.query(
    "UPDATE students SET class_id = ? WHERE id = ?",
    [class_id, student_id],
    (err) => {

      if (err) {
        console.log(err);
        return res.json({ success: false, msg: "Assignment failed" });
      }

      res.json({ success: true, msg: "Class assigned successfully" });
    }
  );
});

app.post("/dos/unassign-student-class", auth, (req, res) => {

  if (req.user.role !== "dos") {
    return res.status(403).json({ success: false });
  }

  const { student_id } = req.body;

  db.query(
    "UPDATE students SET class_id = NULL WHERE id = ?",
    [student_id],
    (err) => {

      if (err) {
        return res.json({ success: false, msg: "Unassign failed" });
      }

      res.json({ success: true, msg: "Class removed" });
    }
  );
});

app.delete("/dos/teachers/:id", auth, (req, res) => {
  if (req.user.role !== "dos") {
    return res.status(403).json({ success: false });
  }

  const id = req.params.id;

  db.query("DELETE FROM teachers WHERE id = ?", [id], (err) => {
    if (err) {
      return res.json({ success: false, msg: "Delete failed" });
    }

    res.json({ success: true, msg: "Teacher deleted" });
  });
});

app.get("/dos/teachers-with-classes", auth, (req, res) => {
  const sql = `
    SELECT 
      t.id AS teacher_id,
      t.name,
      t.email,
      c.name AS class_name
    FROM teachers t
    LEFT JOIN teacher_classes tc ON t.id = tc.teacher_id
    LEFT JOIN classes c ON tc.class_id = c.id
    ORDER BY t.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }

    res.json(rows);
  });
});

app.post("/dos/unassign-class", auth, (req, res) => {
  if (req.user.role !== "dos") {
    return res.status(403).json({ success: false });
  }

  const { teacher_id, class_id } = req.body;

  db.query(
    "DELETE FROM teacher_classes WHERE teacher_id = ? AND class_id = ?",
    [teacher_id, class_id],
    (err) => {
      if (err) return res.json({ success: false });

      res.json({ success: true, msg: "Class unassigned" });
    },
  );
});


// ================= START =================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
