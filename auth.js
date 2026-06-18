import { supabase } from "./supabase.js";

// Call this at the top of any protected page. Reads the locally-persisted
// session, so it still works even if the page is opened with zero internet,
// as long as the user logged in once before on this device.
export async function requireAuth() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}

window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");

  msg.innerText = "Logging in...";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    msg.innerText = "Error: " + error.message;
    return;
  }

  window.location.href = "dashboard.html";
};

window.logout = async function () {
  await supabase.auth.signOut();
  window.location.href = "index.html";
};