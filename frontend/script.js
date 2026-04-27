const API = "http://localhost:5000";

// ================= TEACHER LOGIN =================
async function teacherLogin() {
  try {
    const email = document.getElementById("teacher_email").value;
    const password = document.getElementById("teacher_password").value;

    const res = await fetch(`${API}/teacher-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", "teacher");
      localStorage.setItem("teacher", JSON.stringify(data.teacher));

      window.location.href = "dashboard.html";
    } else {
      alert(data.msg);
    }

  } catch (err) {
    console.error(err);
    alert("Server not reachable");
  }
}

// ================= STUDENT LOGIN (FIXED - THIS WAS MISSING) =================
async function studentLogin() {
  try {
    const email = document.getElementById("student_email").value;
    const password = document.getElementById("student_password").value;

    const res = await fetch("http://127.0.0.1:5000/student-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Server returned non-JSON:", text);
      alert("Server error (check backend route)");
      return;
    }

    if (data.success) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", "student");

  // 🔥 ADD THIS LINE
  localStorage.setItem("studentClass", data.student.class);

  window.location.href = "student-dashboard.html";

    } else {
      alert(data.msg || "Login failed");
    }

  } catch (err) {
    console.error(err);
    alert("Server not reachable");
  }
}
// ================= TASK CREATE (TEACHER) =================
document.addEventListener("DOMContentLoaded", () => {
  const taskForm = document.getElementById("taskForm");

  if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData();

      formData.append("title", document.getElementById("title").value);
      formData.append("description", document.getElementById("description").value);
      formData.append("class", document.getElementById("class").value);
      formData.append("subject", document.getElementById("subject").value);

      const fileInput = document.getElementById("file");
      if (fileInput.files[0]) {
        formData.append("file", fileInput.files[0]);
      }

      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: formData
      });

      const data = await res.json();
      alert(data.msg);

      if (data.success) {
        taskForm.reset();
      }
    });
  }
});
