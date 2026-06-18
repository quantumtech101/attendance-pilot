import { supabase } from "./supabase.js";
import { requireAuth } from "./auth.js";
import {
  getCachedStudents, setCachedStudents,
  getCachedEvent, setCachedEvent,
  getQueue, setQueue,
  getLastStatusMap, setLastStatusMap, updateLastStatus
} from "./offline-db.js";
import { syncQueue } from "./sync.js";

await requireAuth();

/* DOM */
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startScanBtn");
const modalEl = document.getElementById("successModal");
const msgEl = document.getElementById("successMsg");
const okBtn = document.getElementById("scanOkBtn");

/* STATE */
let scanner = null;
let mode = null;
let popupOpen = false;
const lastScan = {};

/* UTIL */
function showStatus(text) { if (statusEl) statusEl.innerText = text; }

/* POPUP */
function showPopup(text, callback) {
  console.log("showPopup called:", text, "popupOpen:", popupOpen);
  if (popupOpen) return;
  popupOpen = true;

  if (!modalEl || !msgEl || !okBtn) {
    console.warn("Modal elements missing, falling back to alert");
    alert(text);
    popupOpen = false;
    if (callback) callback();
    return;
  }

  msgEl.innerText = text;
  // ensure modal visible
  modalEl.style.display = "flex";
  modalEl.style.zIndex = "2147483647";
  modalEl.setAttribute("aria-hidden", "false");

  // stop camera while modal visible
  stopCamera();

  const handler = () => {
    console.log("popup OK clicked");
    modalEl.style.display = "none";
    modalEl.setAttribute("aria-hidden", "true");
    popupOpen = false;
    okBtn.removeEventListener("click", handler);
    if (callback) callback();
  };

  okBtn.addEventListener("click", handler);
}

/* CAMERA HELPERS */
async function getFirstCameraId() {
  try {
    const cams = await Html5Qrcode.getCameras();
    if (!cams || cams.length === 0) return null;
    const back = cams.find(c => /back|rear|environment/i.test(c.label));
    return (back || cams[0]).id;
  } catch (e) {
    console.error("getCameras error", e);
    return null;
  }
}

async function startCamera(type) {
  if (popupOpen) return;
  stopCamera();

  mode = type;
  const containerId = type === "qr" ? "qr-reader" : "barcode-reader";

  try {
    scanner = new Html5Qrcode(containerId, { verbose: false });
    const cameraId = await getFirstCameraId();
    if (!cameraId) {
      showStatus("No camera found");
      return;
    }

    await scanner.start(
      cameraId,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      decodedText => {
        try { processScan(decodedText); } catch (e) { console.error(e); }
      },
      errorMsg => { /* ignore repetitive scan errors */ }
    );

    if (startBtn) startBtn.style.display = "none";
    showStatus("Camera running");
  } catch (err) {
    console.error("startCamera error:", err);
    showStatus("Unable to start camera");
    scanner = null;
    if (startBtn) startBtn.style.display = "inline-block";
  }
}

function stopCamera() {
  if (scanner) {
    scanner.stop().then(() => {
      try { scanner.clear(); } catch (e) {}
    }).catch(() => {
      try { scanner.clear(); } catch (e) {}
    });
    scanner = null;
  }
  if (startBtn) startBtn.style.display = "inline-block";
}

/* TABS & MANUAL */
window.showTab = function(tab) {
  document.getElementById("qrTab").style.display = tab === "qr" ? "block" : "none";
  document.getElementById("barcodeTab").style.display = tab === "barcode" ? "block" : "none";
  document.getElementById("typeTab").style.display = tab === "type" ? "block" : "none";

  if (tab === "qr") startCamera("qr");
  else if (tab === "barcode") startCamera("barcode");
  else stopCamera();
};

window.handleManualSubmit = function() {
  const input = document.getElementById("qrInput");
  const val = (input?.value || "").trim();
  if (input) input.value = "";
  if (val) processScan(val);
};

/* LOAD ROSTER */
async function loadRoster() {
  try {
    const { data: students } = await supabase.from("students").select("*");
    if (students) setCachedStudents(students);

    const { data: events } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (events?.length) setCachedEvent(events[0]);

    showStatus("Scanner ready");
  } catch (e) {
    console.error("loadRoster error", e);
    showStatus("Failed loading roster");
  }
}

/* PROCESS SCAN */
async function processScan(rawId) {
  if (popupOpen) {
    console.log("Ignored scan because popupOpen");
    return;
  }

  const id = (rawId || "").trim();
  if (!id) return;

  const now = Date.now();
  if (lastScan[id] && now - lastScan[id] < 60000) {
    const remaining = Math.ceil((60000 - (now - lastScan[id])) / 1000);
    showStatus(`Please wait ${remaining} seconds before scanning this QR again`);
    return;
  }

  const students = getCachedStudents() || [];
  const student = students.find(s => String(s.student_id) === String(id));
  if (!student) {
    showStatus("Student not found");
    return;
  }

  const event = getCachedEvent();
  if (!event) {
    showStatus("No event loaded");
    return;
  }

  const last = (getLastStatusMap() || {})[id];
  const type = (!last || last.type === "out") ? "in" : "out";

  const record = {
    student_id: id,
    event_id: event.id,
    type,
    scan_time: getAsiaManilaIsoString()
  };

  updateLastStatus(id, type, record.scan_time);
  lastScan[id] = Date.now();

  console.log("About to show popup for", id, "student:", student, "type:", type);
  showPopup(`${student.name || student.full_name || id}\nScan ${type.toUpperCase()} successful`, async () => {
    try {
      if (navigator.onLine) {
        await supabase.from("attendance_logs").insert(record);
        showStatus("Saved online");
      } else {
        const q = getQueue() || [];
        q.push(record);
        setQueue(q);
        showStatus("Saved offline");
      }
    } catch (e) {
      console.error("save error, queueing:", e);
      const q = getQueue() || [];
      q.push(record);
      setQueue(q);
      showStatus("Saved offline (error)");
    }

    setTimeout(() => { window.location.href = "dashboard.html"; }, 300);
  });
}

function getAsiaManilaIsoString() {
  const formatted = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const [date, time] = formatted.split(", ");
  const [month, day, year] = date.split("/");
  const isoString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}`;
  const tzOffset = -8 * 60; // Asia/Manila is UTC+8
  const offsetHours = Math.floor(Math.abs(tzOffset) / 60).toString().padStart(2, "0");
  const offsetMinutes = (Math.abs(tzOffset) % 60).toString().padStart(2, "0");
  const sign = tzOffset <= 0 ? "+" : "-";

  return `${isoString}${sign}${offsetHours}:${offsetMinutes}`;
}

/* INIT */
if (startBtn) startBtn.addEventListener("click", () => {
  startCamera(mode || "qr");
  startBtn.style.display = "none";
});

window.addEventListener("online", () => syncQueue(showStatus));
setInterval(() => syncQueue(), 15000);

loadRoster();
startCamera("qr");
syncQueue(showStatus);
