import { api, clearMessage, escapeHtml, logout, requireRole, showMessage } from "./common.js";

const form = document.getElementById("course-form");
const listRoot = document.getElementById("courses-list");
const messageEl = document.getElementById("message");
const adminNameEl = document.getElementById("admin-name");
const logoutBtn = document.getElementById("logout-btn");

let editingCourseId = null;
let coursesState = [];

logoutBtn?.addEventListener("click", () => logout("/pages/admin-login.html"));

function resetForm() {
  editingCourseId = null;
  form.reset();
  form.querySelector("button[type='submit']").textContent = "Save Course";
}

async function loadCourses() {
  const { courses } = await api("/api/admin/courses");
  coursesState = courses;
  listRoot.innerHTML = courses
    .map(
      (course) => `
        <article class="card list-card">
          <div class="header-row">
            <div>
              <h3>${escapeHtml(course.name)}</h3>
              <div class="question-meta">${course.question_count} questions • ${course.exam_count} exams</div>
            </div>
            <div class="inline-actions">
              <button class="btn-secondary" data-action="edit" data-id="${course.id}">Edit</button>
              <button class="btn-danger" data-action="delete" data-id="${course.id}" data-name="${escapeHtml(course.name)}">Delete</button>
            </div>
          </div>
          ${course.image ? `<img src="${escapeHtml(course.image)}" alt="${escapeHtml(course.name)}">` : ""}
          <div class="toolbar" style="margin-top: 16px;">
            <a class="btn-secondary" href="/pages/admin-questions.html?courseId=${course.id}">Manage Questions</a>
            <a class="btn-secondary" href="/pages/admin-results.html?courseId=${course.id}">View Results</a>
          </div>
        </article>
      `
    )
    .join("");

  listRoot.querySelectorAll("button[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => {
      const course = coursesState.find((item) => item.id === Number(button.dataset.id));
      if (!course) return;
      editingCourseId = course.id;
      form.name.value = course.name;
      form.image.value = course.image || "";
      form.querySelector("button[type='submit']").textContent = "Update Course";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  listRoot.querySelectorAll("button[data-action='delete']").forEach((button) => {
    button.addEventListener("click", async () => {
      const name = button.dataset.name;
      if (!window.confirm(`Delete course "${name}"? This also removes its questions and exam data.`)) {
        return;
      }
      try {
        await api(`/api/admin/courses/${button.dataset.id}`, { method: "DELETE" });
        await loadCourses();
      } catch (error) {
        showMessage(messageEl, error.message);
      }
    });
  });
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(messageEl);

  const name = form.name.value.trim();
  const image = form.image.value.trim();
  if (!name) {
    showMessage(messageEl, "Course name is required");
    return;
  }

  try {
    await api(editingCourseId ? `/api/admin/courses/${editingCourseId}` : "/api/admin/courses", {
      method: editingCourseId ? "PUT" : "POST",
      body: JSON.stringify({ name, image })
    });
    resetForm();
    await loadCourses();
    showMessage(messageEl, "Course saved successfully", "success");
  } catch (error) {
    showMessage(messageEl, error.message);
  }
});

document.getElementById("cancel-edit-btn")?.addEventListener("click", resetForm);

async function init() {
  const user = await requireRole("admin");
  if (!user) return;
  adminNameEl.textContent = `${user.firstName} ${user.lastName}`;
  try {
    await loadCourses();
  } catch (error) {
    showMessage(messageEl, error.message);
  }
}

init();
