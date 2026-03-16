import { api, clearMessage, showMessage } from "./common.js";

const form = document.getElementById("register-form");
const messageEl = document.getElementById("message");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{10,15}$/;

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(messageEl);

  const payload = {
    firstName: form.firstName.value.trim(),
    lastName: form.lastName.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value
  };

  if (Object.values(payload).some((value) => !value)) {
    showMessage(messageEl, "All fields are required");
    return;
  }
  if (!PHONE_RE.test(payload.phone)) {
    showMessage(messageEl, "Enter a valid phone number");
    return;
  }
  if (!EMAIL_RE.test(payload.email)) {
    showMessage(messageEl, "Enter a valid email address");
    return;
  }

  try {
    await api("/api/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    window.location.href = "/pages/courses.html";
  } catch (error) {
    showMessage(messageEl, error.message);
  }
});
