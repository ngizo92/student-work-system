const API = "http://localhost:5000";

/* ================= GLOBAL WRITE STORAGE FIX ================= */
let writtenWorkContent = "";

/* ================= SAVE WRITTEN WORK ================= */
function saveWrittenWork(value) {
    writtenWorkContent = value;
}

/* ================= LOGIN (STUDENT) ================= */
async function login() {

    const email = document.getElementById("name").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API}/api/student/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {

        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", "student");
        localStorage.setItem("student", JSON.stringify(data.student));

        window.location.href = "student-dashboard.html";

    } else {
        alert(data.message || "Login failed");
    }
}

/* ================= LOAD TASKS ================= */
async function loadTasks() {

    const token = localStorage.getItem("token");
    const student = JSON.parse(localStorage.getItem("student"));

    const taskList = document.getElementById("taskList");

    try {

        const res = await fetch(`${API}/api/tasks`, {
            headers: {
                "Authorization": token || ""
            }
        });

        const data = await res.json();

        taskList.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {
            taskList.innerHTML = "<div class='empty'>No assignments available</div>";
            return;
        }

        let hasTasks = false;

        data.forEach(task => {

            // ✅ SAFE CLASS FILTER (FIXED)
            if (
                student &&
                task.class &&
                student.class &&
                task.class.toString().trim().toLowerCase() !== student.class.toString().trim().toLowerCase()
            ) {
                return;
            }

            hasTasks = true;

            taskList.innerHTML += `
                <div class="task-card">

                    <h3>${task.title || "No Title"}</h3>

                    <p>${task.description || ""}</p>

                    <p><b>Class:</b> ${task.class || ""}</p>
                    <p><b>Subject:</b> ${task.subject || ""}</p>

                    <p><b>Assigned Date:</b> ${
                        task.created_at
                            ? new Date(task.created_at).toLocaleString()
                            : "N/A"
                    }</p>

                    <a href="${API}/uploads/${task.file_path}" target="_blank">
                        📥 Download File
                    </a>

                    <br><br>

                    <input type="file" id="file-${task.id}">
                    <button onclick="submitWork(${task.id})">Submit</button>

                </div>
            `;
        });

        if (!hasTasks) {
            taskList.innerHTML = "<div class='empty'>No assignments for your class</div>";
        }

    } catch (err) {
        console.log("LOAD TASK ERROR:", err);
        taskList.innerHTML = "<div class='empty'>Failed to load assignments</div>";
    }
}
/* ================= SUBMIT WORK ================= */
async function submitWork(taskId) {

    const token = localStorage.getItem("token");
    const student = JSON.parse(localStorage.getItem("student"));
    const file = document.getElementById(`file-${taskId}`).files[0];

    if (!file) {
        alert("Select a file first");
        return;
    }

    const formData = new FormData();
    formData.append("student", student.id);
    formData.append("task_id", taskId);
    formData.append("file", file);

    const res = await fetch(`${API}/api/tasks/submit`, {
        method: "POST",
        headers: {
            "Authorization": token
        },
        body: formData
    });

    const data = await res.json();

    alert(data.message || "Submitted");
}

/* ================= LOAD STUDENTS ================= */
async function loadStudents() {

    const token = localStorage.getItem("token");

    const res = await fetch(`${API}/api/manage/students`, {
        headers: {
            "Authorization": token
        }
    });

    const data = await res.json();

    let html = "";

    data.forEach(stu => {

        html += `
            <div class="task-card">
                <p><b>Name:</b> ${stu.name}</p>
                <p><b>Email:</b> ${stu.email}</p>
                <p><b>Class:</b> ${stu.class}</p>

                <button onclick="deleteStudent(${stu.id})">Delete</button>
            </div>
        `;
    });

    document.getElementById("studentList").innerHTML = html;
}

/* ================= CREATE STUDENT ================= */
async function createStudent() {

    const name = document.getElementById("sName").value;
    const email = document.getElementById("sEmail").value;
    const className = document.getElementById("sClass").value;
    const password = document.getElementById("sPassword").value;

    const token = localStorage.getItem("token");

    const res = await fetch(`${API}/api/manage/create-student`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token
        },
        body: JSON.stringify({
            name,
            email,
            class: className,
            password
        })
    });

    const data = await res.json();

    if (data.success) {
        alert("Student created successfully");
        document.getElementById("studentModal").style.display = "none";
        loadStudents();
    } else {
        alert(data.message);
    }
}

/* ================= DELETE STUDENT ================= */
async function deleteStudent(id) {

    const token = localStorage.getItem("token");

    if (!confirm("Delete student?")) return;

    const res = await fetch(`${API}/api/manage/student/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": token
        }
    });

    const data = await res.json();

    if (data.success) {
        alert("Deleted");
        loadStudents();
    }
}

/* ================= TEACHER CREATE TASK ================= */
async function createTask() {

    const token = localStorage.getItem("token");

    const title = document.getElementById("tTitle").value;
    const description = document.getElementById("tDesc").value;
    const className = document.getElementById("tClass").value;
    const subject = document.getElementById("tSubject").value;
    const file = document.getElementById("tFile").files[0];

    /* ===== FIX FOR WRITE MODE ===== */
    const writeDescription = writtenWorkContent;

    const finalDescription = description || writeDescription;

    if (!title || !className || !file) {
        alert("Fill required fields + file");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", finalDescription); // 🔥 FIX APPLIED
    formData.append("class", className);
    formData.append("subject", subject);
    formData.append("file", file);

    try {

        const res = await fetch(`${API}/api/tasks`, {
            method: "POST",
            headers: {
                "Authorization": token
            },
            body: formData
        });

        const data = await res.json();

        if (data.success === true) {

            alert("Task added successfully");

            document.getElementById("tTitle").value = "";
            document.getElementById("tDesc").value = "";
            document.getElementById("tClass").value = "";
            document.getElementById("tSubject").value = "";
            document.getElementById("tFile").value = "";

            writtenWorkContent = ""; // reset write mode

        } else {
            alert(data.message || "Task not added");
        }

    } catch (err) {
        console.log(err);
        alert("Server error");
    }
}

/* ================= FILE PICKER ================= */
function openFilePicker() {

    const input = document.createElement("input");
    input.type = "file";

    input.onchange = async function () {

        const file = input.files[0];

        const title = prompt("Title:");
        const description = prompt("Description:");
        const className = prompt("Class:");
        const subject = prompt("Subject:");

        const token = localStorage.getItem("token");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("class", className);
        formData.append("subject", subject);

        const res = await fetch(`${API}/api/tasks`, {
            method: "POST",
            headers: {
                "Authorization": token
            },
            body: formData
        });

        const data = await res.json();

        alert(data.message || "Uploaded");
    };

    input.click();
}

/* ================= LOGOUT ================= */
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}