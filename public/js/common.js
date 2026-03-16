export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export function showMessage(element, message, type = "error") {
  if (!element) return;
  element.textContent = message;
  element.className = `message ${type}`;
}

export function clearMessage(element) {
  if (!element) return;
  element.textContent = "";
  element.className = "message";
}

export function formatDuration(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function requireRole(expectedRole) {
  const { user } = await api("/api/me");
  if (!user || (expectedRole && user.role !== expectedRole)) {
    window.location.href = expectedRole === "admin" ? "/pages/admin-login.html" : "/pages/login.html";
    return null;
  }
  return user;
}

export async function logout(redirectPath) {
  await api("/api/logout", { method: "POST" });
  window.location.href = redirectPath;
}
