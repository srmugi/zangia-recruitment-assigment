import { api, clearMessage, showMessage } from "./common.js";

const form = document.getElementById("login-form");
const messageEl = document.getElementById("message");
const adminMode = document.body.dataset.role === "admin";

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(messageEl);

  const login = form.login.value.trim();
  const password = form.password.value.trim();

  if (!login || !password) {
    showMessage(messageEl, "Both fields are required");
    return;
  }

  try {
    const { user } = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ login, password })
    });

    if (adminMode && user.role !== "admin") {
      showMessage(messageEl, "This page is for admin users only");
      await api("/api/logout", { method: "POST" });
      return;
    }

    if (!adminMode && user.role === "admin") {
      window.location.href = "/pages/admin-courses.html";
      return;
    }

    window.location.href = user.role === "admin" ? "/pages/admin-courses.html" : "/pages/courses.html";
  } catch (error) {
    showMessage(messageEl, error.message);
  }
});
