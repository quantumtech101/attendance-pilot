import { supabase } from "./supabase.js";
import { requireAuth } from "./auth.js";

await requireAuth();

let allLogs = [];
let currentLogs = [];
let currentNameMap = {};

window.refreshAll = loadData;
window.searchDashboard = function () {
  const query = document.getElementById("dashboardSearch").value.trim().toLowerCase();
  if (!query) {
    currentLogs = allLogs;
  } else {
    currentLogs = allLogs.filter(l => {
      const id = String(l.student_id || "").toLowerCase();
      const name = String(currentNameMap[l.student_id] || "").toLowerCase();
      const type = String(l.type || "").toLowerCase();
      const time = String(formatPhilippineTime(l.scan_time)).toLowerCase();
      return id.includes(query) || name.includes(query) || type.includes(query) || time.includes(query);
    });
  }
  renderLogs(currentLogs, currentNameMap);
  renderHours(currentLogs, currentNameMap);
};

async function loadData() {
  const { data: students } = await supabase.from("students").select("student_id, full_name");
  currentNameMap = {};
  (students || []).forEach(s => currentNameMap[s.student_id] = s.full_name);

  const { data: logs, error } = await supabase
    .from("attendance_logs")
    .select("*")
    .order("scan_time", { ascending: false });

  if (error) { console.log(error); return; }

  allLogs = logs || [];
  currentLogs = allLogs;
  document.getElementById("dashboardSearch").value = "";
  renderLogs(currentLogs, currentNameMap);
  renderHours(currentLogs, currentNameMap);
}

function formatPhilippineTime(isoString) {
  return new Date(isoString).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function renderLogs(logs, nameMap) {
  const tbody = document.getElementById("logsBody");
  tbody.innerHTML = "";
  logs.forEach(l => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${l.student_id}</td>
      <td>${nameMap[l.student_id] ?? ""}</td>
      <td>${l.type}</td>
      <td>${formatPhilippineTime(l.scan_time)}</td>
      <td>${l.duration_minutes ?? ""}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderHours(logs, nameMap) {
  const totals = {};
  logs.forEach(l => {
    if (l.type === "out" && l.duration_minutes) {
      totals[l.student_id] = (totals[l.student_id] || 0) + l.duration_minutes;
    }
  });

  const tbody = document.getElementById("hoursBody");
  tbody.innerHTML = "";
  Object.keys(totals).forEach(id => {
    const hours = (totals[id] / 60).toFixed(2);
    const row = document.createElement("tr");
    row.innerHTML = `<td>${id}</td><td>${nameMap[id] ?? ""}</td><td>${hours}</td>`;
    tbody.appendChild(row);
  });
}

loadData();