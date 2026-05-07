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

const classSelect = document.getElementById("class_id");
const className = classSelect.options[classSelect.selectedIndex].text;

formData.append("class", className);

formData.append("subject", document.getElementById("subject").value);
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

  const name = document.getElementById("t_name").value;
  const email = document.getElementById("t_email").value;
  const password = document.getElementById("t_password").value;

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
    document.getElementById("t_name").value = "";
    document.getElementById("t_email").value = "";
    document.getElementById("t_password").value = "";
  }
}
async function loadSubmissions() {

    try {

        const res = await fetch(`${API}/submissions-view`, {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        });

        const data = await res.json();

        console.log("SUBMISSIONS:", data);

        const unmarkedContainer = document.getElementById("unmarkedList");
        const markedContainer = document.getElementById("markedList");

        unmarkedContainer.innerHTML = "";
        markedContainer.innerHTML = "";

        data.forEach(sub => {

            const isMarked =
                sub.marks !== null &&
                sub.marks !== undefined;

            const container = isMarked
                ? markedContainer
                : unmarkedContainer;

            const div = document.createElement("div");

            div.className = "task-card";

            div.innerHTML = `
                <h4>${sub.task_title || "No Title"}</h4>

                <p><b>Student:</b> ${sub.student_name || "Unknown"}</p>

                <p><b>Answer:</b> ${sub.answer || ""}</p>

                ${
                  sub.file_path
                    ? `
                    <a href="${API}/uploads/${sub.file_path}" target="_blank">
                        📎 Download File
                    </a>
                  `
                    : ""
                }

                ${
                  !isMarked
                    ? `
                    <input
                        type="number"
                        id="marks-${sub.id}"
                        placeholder="Marks"
                    />

                    <input
                        type="text"
                        id="feedback-${sub.id}"
                        placeholder="Feedback"
                    />

                    <button onclick="gradeSubmission(${sub.id})">
                        Mark Work
                    </button>
                  `
                    : `
                    <p><b>Marks:</b> ${sub.marks}</p>

                    <p><b>Feedback:</b> ${sub.feedback || ""}</p>

                    <p style="color:green;">
                        ✅ Marked
                    </p>
                  `
                }

                <small>${sub.created_at}</small>
            `;

            container.appendChild(div);

        });

        // counts
        document.getElementById("totalSub").innerText =
            data.length;

        document.getElementById("unmarkedCount").innerText =
            unmarkedContainer.children.length;

        document.getElementById("markedCount").innerText =
            markedContainer.children.length;

    } catch (err) {

        console.log(err);

    }

}
  
async function gradeSubmission(id) {

    const marks = document.getElementById(`marks-${id}`).value;

    const feedback =
        document.getElementById(`feedback-${id}`).value;

    const res = await fetch(`${API}/grade-submission`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json",
            Authorization:
                "Bearer " + localStorage.getItem("token")
        },

        body: JSON.stringify({
            submission_id: id,
            marks,
            feedback
        })

    });

    const data = await res.json();

    alert(data.msg);

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

console.log("🔥 showStudents is running");

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

    console.log("RENDERING:", list); // debug

    list.innerHTML = "";

    data.forEach(st => {

       const card = `
<div class="task-card">
    <h4>${st.name}</h4>
    <p><b>Email:</b> ${st.email}</p>
    <p><b>Class:</b> ${st.class || "Not assigned"}</p>
    <p><b>Subject:</b> ${st.subject || "-"}</p>
    <button onclick="deleteStudent(${st.id})" style="background:#e74c3c;">
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
            (st.class_id && String(st.class_id).includes(query))
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
    const box = document.getElementById("entityOptions");
    box.style.display = box.style.display === "block" ? "none" : "block";
}

function goStudent() {
    window.location.href = "student-login.html";
}

function goTeacher() {
    window.location.href = "teacher-login.html";
}

function goDos() {
    window.location.href = "dos-login.html";
}

function openDosLogin() {
    document.getElementById("dosModal").style.display = "flex";
}

function closeDosLogin() {
    document.getElementById("dosModal").style.display = "none";
}

function openDosRegister() {
    window.location.href = "dos-register.html";
}

async function dosLogin() {

  const email = document.getElementById("dos_email").value;
  const password = document.getElementById("dos_password").value;

  const res = await fetch(`${API}/dos-login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

 if (data.success) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", "dos");

  window.location.href = "dos-dashboard.html";
}
}

function openClassModal() {
    document.getElementById("classModal").style.display = "flex";
}

function closeClassModal() {
    document.getElementById("classModal").style.display = "none";
}

async function createClass() {

  const name = document.getElementById("class_name").value;
  const level = document.getElementById("class_level").value;
  const description = document.getElementById("class_description").value;

  const res = await fetch(`${API}/dos/create-class`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ name, level, description })
  });

  const data = await res.json();

  alert(data.msg);

  if (data.success) {
    closeClassModal();
    loadStats();
  }
}
async function assignClass(student_id) {

    const class_id = document.getElementById(`class-${student_id}`).value;

    if (!class_id) {
        alert("Select a class first");
        return;
    }

    const res = await fetch(`${API}/dos/assign-class`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
            student_id,
            class_id
        })
    });

    const data = await res.json();

    alert(data.msg);

    if (data.success) {
        showStudents(); // refresh list
    }
}

async function unassignStudentClass(studentId) {

  if (!confirm("Remove class from this student?")) return;

  const res = await fetch(`${API}/dos/unassign-student-class`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ student_id: studentId })
  });

  const data = await res.json();

  alert(data.msg);

  if (data.success) {
    loadStudents();
  }
}
