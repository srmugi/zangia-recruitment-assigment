import { api, escapeHtml, logout, requireRole, showMessage } from "./common.js";

const courseGrid = document.getElementById("courses-grid");
const messageEl = document.getElementById("message");
const userNameEl = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");

logoutBtn?.addEventListener("click", () => logout("/pages/login.html"));

async function init() {
  const user = await requireRole("user");
  if (!user) return;
  userNameEl.textContent = `${user.firstName} ${user.lastName}`;

  try {
    const { courses } = await api("/api/courses");
    if (courses.length === 0) {
      showMessage(messageEl, "No courses are available yet", "success");
      return;
    }

    courseGrid.innerHTML = courses
      .map(
        (course) => `
          <article class="card course-card">
            <img src="${escapeHtml(course.image || "https://via.placeholder.com/600x300?text=Course")}" alt="${escapeHtml(course.name)}">
            <div class="course-body">
              <h3>${escapeHtml(course.name)}</h3>
              <p>${course.question_count} questions available</p>
              <button class="btn-primary" data-course-id="${course.id}">Start Exam</button>
            </div>
          </article>
        `
      )
      .join("");

    courseGrid.querySelectorAll("button[data-course-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const payload = await api("/api/exams/start", {
            method: "POST",
            body: JSON.stringify({ courseId: Number(button.dataset.courseId) })
          });
          sessionStorage.setItem("activeExam", JSON.stringify(payload));
          window.location.href = "/pages/exam.html";
        } catch (error) {
          showMessage(messageEl, error.message);
        }
      });
    });
  } catch (error) {
    showMessage(messageEl, error.message);
  }
}

init();
