import { supabase } from "./supabase.js";
import { getQueue, setQueue } from "./offline-db.js";

// Pushes pending offline scans to Supabase. Safe to call repeatedly — each
// item is only removed from the queue once it's confirmed saved, so nothing
// gets sent twice.
export async function syncQueue(onStatus) {
  if (!navigator.onLine) return;

  const queue = getQueue();
  if (queue.length === 0) return;

  if (onStatus) onStatus(`Syncing ${queue.length} pending scan(s)...`);

  const stillPending = [];

  for (const item of queue) {
    const { error } = await supabase.from("attendance_logs").insert({
      student_id: item.student_id,
      event_id: item.event_id,
      type: item.type,
      scan_time: item.scan_time,
      duration_minutes: item.duration_minutes,
      synced: true
    });

    if (error) stillPending.push(item);
  }

  setQueue(stillPending);

  if (onStatus) {
    onStatus(stillPending.length === 0
      ? "All scans synced."
      : `${stillPending.length} scan(s) still waiting to sync.`);
  }
}