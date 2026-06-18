import { supabase } from "./supabase.js";
import { requireAuth } from "./auth.js";

await requireAuth();

let students = [];
let visibleStudents = [];

async function loadStudents() {
  const { data, error } = await supabase.from("students").select("*").order("created_at");
  if (error) { console.log(error); return; }
  students = data || [];
  visibleStudents = students;
  render();
}

function render() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  visibleStudents.forEach(s => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${s.student_id}</td>
      <td>${s.full_name ?? ""}</td>
      <td>${s.course ?? ""}</td>
      <td>${s.year_level ?? ""}</td>
      <td>${s.section ?? ""}</td>
      <td><div id="qr-${s.student_id}"></div></td>
      <td><button onclick="downloadQR('${s.student_id}')">Download</button></td>
    `;
    tbody.appendChild(row);
  });

  visibleStudents.forEach(s => {
    const container = document.getElementById(`qr-${s.student_id}`);
    if (container) {
      container.innerHTML = "";
      new QRCode(container, {
        text: s.student_id,
        width: 90,
        height: 90
      });
    }
  });
}

window.searchStudents = function () {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!query) {
    visibleStudents = students;
    render();
    return;
  }

  visibleStudents = students.filter(s => {
    const id = String(s.student_id || "").toLowerCase();
    const name = String(s.full_name || "").toLowerCase();
    return id.includes(query) || name.includes(query);
  });

  render();
};

window.resetSearch = function () {
  document.getElementById("searchInput").value = "";
  visibleStudents = students;
  render();
};

window.addStudent = async function () {
  const student_id = document.getElementById("newId").value.trim();
  const full_name = document.getElementById("newName").value.trim();
  const course = document.getElementById("newCourse").value.trim();
  const year_level = document.getElementById("newYear").value.trim();
  const section = document.getElementById("newSection").value.trim();
  const msg = document.getElementById("addMsg");

  if (!student_id || !full_name) {
    msg.innerText = "Student ID and Name are required.";
    return;
  }

  const { error } = await supabase.from("students").insert({
    student_id, full_name, course, year_level, section, qr_code: student_id
  });

  if (error) {
    msg.innerText = "Error: " + error.message;
    return;
  }

  msg.innerText = "Added!";
  ["newId", "newName", "newCourse", "newYear", "newSection"].forEach(id => {
    document.getElementById(id).value = "";
  });
  loadStudents();
};

window.downloadQR = function (studentId) {
  const canvas = document.querySelector(`#qr-${studentId} canvas`);
  if (!canvas) { alert("QR not ready yet"); return; }
  const link = document.createElement("a");
  link.download = `${studentId}-QR.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

loadStudents();