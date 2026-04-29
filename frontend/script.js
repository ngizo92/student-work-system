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

// ================= STUDENT LOGIN =================
async function studentLogin() {
  try {
    const email = document.getElementById("student_email").value;
    const password = document.getElementById("student_password").value;

    const res = await fetch(`${API}/student-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", "student");
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

// ================= CREATE TASK (FIXED ONLY PART) =================
document.addEventListener("DOMContentLoaded", () => {

  const taskForm = document.getElementById("taskForm");

  if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Teacher not logged in");
        return;
      }

      const formData = new FormData();

      formData.append("title", document.getElementById("title").value);
      formData.append("description", document.getElementById("description").value);
      formData.append("class", document.getElementById("class").value);
      formData.append("subject", document.getElementById("subject").value);

      // ⭐ ONLY REQUIRED ADDITION (YOUR REQUEST)
      formData.append("priority", document.getElementById("priority").value);
      formData.append("deadline", document.getElementById("deadline").value);

      const fileInput = document.getElementById("file");
      if (fileInput.files[0]) {
        formData.append("file", fileInput.files[0]);
      }

      try {
        const res = await fetch(`${API}/tasks`, {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token
          },
          body: formData
        });

        const data = await res.json();

        alert(data.msg || "Task created");

        if (data.success) {
          taskForm.reset();
        }

      } catch (err) {
        console.error(err);
        alert("Server error");
      }
    });
  }
});

// ================= CREATE TEACHER =================
async function createTeacher() {
  try {
    const name = document.getElementById("t_name").value.trim();
    const email = document.getElementById("t_email_reg").value.trim();
    const password = document.getElementById("t_password_reg").value.trim();

    if (!name || !email || !password) {
      alert("All fields are required");
      return;
    }

    const res = await fetch(`${API}/create-teacher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    alert(data.msg);

    if (data.success) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", "teacher");
      localStorage.setItem("teacher", JSON.stringify(data.teacher));

      window.location.href = "dashboard.html";
    }

  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}
async function loadSubmissions() {
    try {
        const res = await fetch(`${API}/submissions-view`);
        const data = await res.json();

        const unmarkedContainer = document.getElementById("unmarkedList");
        const markedContainer = document.getElementById("markedList");

        unmarkedContainer.innerHTML = "";
        markedContainer.innerHTML = "";

        data.forEach(sub => {


         console.log("SUBMISSION DEBUG:", sub.id, sub.marks); // ✅ ADD HERE

         const isMarked = sub.marks != null;

            const cardHTML = `
                <div class="task-card">
                    <h4>${sub.task_title || "No Task Title"}</h4>
                    <p><b>Student:</b> ${sub.student_name || "Unknown"}</p>
                    <p><b>Answer:</b> ${sub.answer || "No answer"}</p>

                    ${sub.file_path ? `<p><a href="${API}/uploads/${sub.file_path}" target="_blank">Download File</a></p>` : ""}

                    ${
                      !isMarked ? `
                        <input type="number" id="marks-${sub.id}" placeholder="Marks" />
                        <input type="text" id="feedback-${sub.id}" placeholder="Feedback" />
                        <button onclick="gradeSubmission(${sub.id})">Submit Grade</button>
                      ` : `
                   <p><b>Marks:</b> ${sub.marks}</p>
                 <p><b>Feedback:</b> ${sub.feedback || ""}</p>

                  <button onclick="deleteSubmission(${sub.id})" style="background:red; margin-top:10px;">
                 🗑 Delete
                 </button>
                `
                    }

                    <small>${sub.created_at}</small>
                </div>
            `;

            if (isMarked) {
                markedContainer.innerHTML += cardHTML;
            } else {
                unmarkedContainer.innerHTML += cardHTML;
            }

        });

        // ✅ empty states
        if (!unmarkedContainer.innerHTML) {
            unmarkedContainer.innerHTML = "<p>No unmarked submissions</p>";
        }

        if (!markedContainer.innerHTML) {
            markedContainer.innerHTML = "<p>No marked submissions yet</p>";
        }

    } catch (err) {
        console.error("Failed to load submissions", err);
    }
}

// ================= POPUP =================
function openPopup() {
  document.getElementById("teacherPopup").style.display = "block";
}

function closePopup() {
  document.getElementById("teacherPopup").style.display = "none";
}

document.getElementById("studentForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    const res = await fetch(`${API}/teacherStudent/create-student`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify({
            name: document.getElementById("s_name").value,
            email: document.getElementById("s_email").value,
            class: document.getElementById("s_class").value,
            subject: document.getElementById("s_subject").value,
            password: document.getElementById("s_password").value
        })
    });

    const data = await res.json();

    alert(data.msg);

    if (data.success) {
        document.getElementById("studentForm").reset();
    }
});

async function gradeSubmission(id) {

    const marks = document.getElementById(`marks-${id}`).value;
    const feedback = document.getElementById(`feedback-${id}`).value;

    await fetch(`${API}/grade-submission`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
            submission_id: id,
            marks,
            feedback
        })
    });

    alert("Graded successfully");
    loadSubmissions();
}

function showSubmissionSection(type) {
    const unmarked = document.getElementById("unmarkedList");
    const marked = document.getElementById("markedList");

    if (type === "unmarked") {
        unmarked.style.display = "block";
        marked.style.display = "none";
    } else {
        unmarked.style.display = "none";
        marked.style.display = "block";
    }
}

async function deleteSubmission(id) {

    if (!confirm("Are you sure you want to delete this submission?")) return;

    const res = await fetch(`${API}/delete-submission/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: "Bearer " + localStorage.getItem("token")
        }
    });

    const data = await res.json();

    alert(data.msg);

    if (data.success) {
        loadSubmissions(); // 🔥 refresh UI
    }
}
