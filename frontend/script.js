const API = "http://localhost:5000";

// ================= TEACHER LOGIN =================
async function teacherLogin() {

  const emailEl = document.getElementById("teacher_email");
  const passEl = document.getElementById("teacher_password");

  if (!emailEl || !passEl) {
    console.error("Teacher login inputs not found on this page");
    return;
  }

  const email = emailEl.value;
  const password = passEl.value;

  try {
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

const studentForm = document.getElementById("studentForm");

if (studentForm) {
    studentForm.addEventListener("submit", async (e) => {
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
}
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

async function showStudents() {

    const section = document.getElementById("studentsSection");
    const list = document.getElementById("studentsList");

    hideAllSections();
    section.style.display = "block";

    list.innerHTML = "Loading...";

    try {
        const res = await fetch(`${API}/students`, {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        });

        const data = await res.json();

        allStudents = data; // ✅ store globally

        renderStudents(allStudents); // ✅ display

    } catch (err) {
        console.error(err);
        list.innerHTML = "<p>Failed to load students</p>";
    }
}

function renderStudents(data) {

    const list = document.getElementById("studentsList");
    list.innerHTML = "";

    if (!data || data.length === 0) {
        list.innerHTML = "<p>No students found</p>";
        return;
    }

    data.forEach(st => {

       const card = `
    <div class="task-card">
        <h4>${st.name}</h4>
        <p><b>Email:</b> ${st.email}</p>
        <p><b>Class:</b> ${st.class || "-"}</p>
        <p><b>Subject:</b> ${st.subject || "-"}</p>

        <button 
            onclick="deleteStudent(${st.id})" 
            style="background:#e74c3c; margin-top:10px;">
            🗑 Delete
        </button>
    </div>
`;

        list.innerHTML += card;
    });
}

function filterStudents() {

    const query = document
        .getElementById("studentSearch")
        .value
        .toLowerCase();

    const filtered = allStudents.filter(st => {

        return (
            (st.name && st.name.toLowerCase().includes(query)) ||
            (st.email && st.email.toLowerCase().includes(query)) ||
            (st.class && st.class.toLowerCase().includes(query)) ||
            (st.subject && st.subject.toLowerCase().includes(query))
        );
    });

    renderStudents(filtered);
}

function hideAllSections() {
    const sec = document.getElementById("studentsSection");
    if (sec) sec.style.display = "none";
}

async function deleteStudent(id) {

    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
        const res = await fetch(`${API}/students/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        });

        const data = await res.json();

        alert(data.msg);

        if (data.success) {
            // refresh list
            showStudents();
        }

    } catch (err) {
        console.error(err);
        alert("Delete failed");
    }
}

function showEntities() {
    document.getElementById("entityOptions").style.display = "block";
}

function goStudent() {
    window.location.href = "student-login.html";
}

function goTeacher() {
    window.location.href = "teacher-login.html";
}
