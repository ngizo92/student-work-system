const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC FILES (UPLOADS) =================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= FRONTEND SERVING =================
// (THIS FIXES YOUR "CANNOT SEE INDEX.HTML" ISSUE)
app.use(express.static(path.join(__dirname, "frontend")));

// ================= ROUTES =================
app.use("/api", require("./routes/authRoutes"));
app.use("/api/manage", require("./routes/teacherStudentRoutes"));
app.use("/api", require("./routes/taskRoutes"));

// ================= DEFAULT ROUTE =================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// ================= START SERVER =================
app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});