// All offline state lives here, in localStorage. Keeps the scanner working
// with zero internet for as long as the page stays open.

const KEYS = {
  students: "att_students_cache",
  event: "att_event_cache",
  queue: "att_pending_queue",
  lastStatus: "att_last_status"
};

export function getCachedStudents() {
  return JSON.parse(localStorage.getItem(KEYS.students) || "[]");
}
export function setCachedStudents(students) {
  localStorage.setItem(KEYS.students, JSON.stringify(students));
}

export function getCachedEvent() {
  const raw = localStorage.getItem(KEYS.event);
  return raw ? JSON.parse(raw) : null;
}
export function setCachedEvent(event) {
  localStorage.setItem(KEYS.event, JSON.stringify(event));
}

export function getQueue() {
  return JSON.parse(localStorage.getItem(KEYS.queue) || "[]");
}
export function setQueue(queue) {
  localStorage.setItem(KEYS.queue, JSON.stringify(queue));
}

// lastStatus tracks, per student_id, the most recent scan we know about —
// whether it's already confirmed saved or still sitting in the queue. This
// is what makes the IN/OUT toggle correct even with zero internet.
export function getLastStatusMap() {
  return JSON.parse(localStorage.getItem(KEYS.lastStatus) || "{}");
}
export function setLastStatusMap(map) {
  localStorage.setItem(KEYS.lastStatus, JSON.stringify(map));
}
export function updateLastStatus(student_id, type, scan_time) {
  const map = getLastStatusMap();
  map[student_id] = { type, scan_time };
  setLastStatusMap(map);
}