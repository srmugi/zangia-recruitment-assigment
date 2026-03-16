import { api, escapeHtml, requireRole, showMessage } from "./common.js";

const params = new URLSearchParams(window.location.search);
const courseId = Number(params.get("courseId"));
const titleEl = document.getElementById("course-title");
const bodyEl = document.getElementById("results-body");
const messageEl = document.getElementById("message");

async function init() {
  if (!courseId) {
    window.location.href = "/pages/admin-courses.html";
    return;
  }
  const user = await requireRole("admin");
  if (!user) return;

  try {
    const { course, results } = await api(`/api/admin/courses/${courseId}/results`);
    titleEl.textContent = course.name;

    if (results.length === 0) {
      showMessage(messageEl, "No completed exams for this course yet", "success");
      return;
    }

    bodyEl.innerHTML = results
      .map(
        (result) => `
          <tr>
            <td>${result.user_id}</td>
            <td>${escapeHtml(result.user_name)}</td>
            <td>${escapeHtml(result.email)}</td>
            <td>${escapeHtml(result.phone)}</td>
            <td>${result.correct_count}</td>
            <td>${result.incorrect_count}</td>
            <td>${result.score}/${result.total_questions}</td>
            <td>${result.answered_count}</td>
            <td>${result.duration_seconds}s</td>
            <td>${escapeHtml(result.submitted_at || "")}</td>
          </tr>
        `
      )
      .join("");
  } catch (error) {
    showMessage(messageEl, error.message);
  }
}

init();
