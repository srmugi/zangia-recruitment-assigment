import { api, clearMessage, escapeHtml, requireRole, showMessage } from "./common.js";

const params = new URLSearchParams(window.location.search);
const courseId = Number(params.get("courseId"));
const form = document.getElementById("question-form");
const listRoot = document.getElementById("questions-list");
const courseTitleEl = document.getElementById("course-title");
const messageEl = document.getElementById("message");

let editingQuestionId = null;
let questionsState = [];

function collectPayload() {
  return {
    text: form.text.value.trim(),
    image: form.image.value.trim(),
    audio: form.audio.value.trim(),
    video: form.video.value.trim(),
    correctAnswer: form.correctAnswer.value.trim(),
    incorrectAnswers: [
      form.incorrectAnswer1.value.trim(),
      form.incorrectAnswer2.value.trim(),
      form.incorrectAnswer3.value.trim(),
      form.incorrectAnswer4.value.trim(),
      form.incorrectAnswer5.value.trim()
    ].filter(Boolean)
  };
}

function resetForm() {
  editingQuestionId = null;
  form.reset();
  form.querySelector("button[type='submit']").textContent = "Save Question";
}

async function loadQuestions() {
  const { course, questions } = await api(`/api/admin/courses/${courseId}/questions`);
  courseTitleEl.textContent = course.name;
  questionsState = questions;

  listRoot.innerHTML = questions
    .map((question) => {
      return `
        <article class="card list-card">
          <div class="header-row">
            <div>
              <h3>${escapeHtml(question.text || "Media-only question")}</h3>
              <div class="question-meta">Answers: ${question.answers.length}</div>
            </div>
            <div class="inline-actions">
              <button class="btn-secondary" data-action="edit" data-id="${question.id}">Edit</button>
              <button class="btn-danger" data-action="delete" data-id="${question.id}">Delete</button>
            </div>
          </div>
          ${question.image ? `<div class="media-frame"><img src="${escapeHtml(question.image)}" alt="Question image"></div>` : ""}
          ${question.audio ? `<div class="media-frame"><audio controls src="${escapeHtml(question.audio)}"></audio></div>` : ""}
          ${question.video ? `<div class="media-frame"><video controls src="${escapeHtml(question.video)}"></video></div>` : ""}
          <ul>
            ${question.answers
              .map((answer) => `<li>${escapeHtml(answer.text)} ${answer.is_correct ? "<strong>(Correct)</strong>" : ""}</li>`)
              .join("")}
          </ul>
        </article>
      `;
    })
    .join("");

  listRoot.querySelectorAll("button[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => {
      const question = questionsState.find((item) => item.id === Number(button.dataset.id));
      if (!question) return;
      editingQuestionId = question.id;
      form.text.value = question.text || "";
      form.image.value = question.image || "";
      form.audio.value = question.audio || "";
      form.video.value = question.video || "";

      const correct = question.answers.find((answer) => answer.is_correct === 1);
      const incorrect = question.answers.filter((answer) => answer.is_correct === 0);
      form.correctAnswer.value = correct ? correct.text : "";
      [1, 2, 3, 4, 5].forEach((index) => {
        form[`incorrectAnswer${index}`].value = incorrect[index - 1]?.text || "";
      });
      form.querySelector("button[type='submit']").textContent = "Update Question";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  listRoot.querySelectorAll("button[data-action='delete']").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this question?")) {
        return;
      }
      try {
        await api(`/api/admin/questions/${button.dataset.id}`, { method: "DELETE" });
        await loadQuestions();
      } catch (error) {
        showMessage(messageEl, error.message);
      }
    });
  });
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(messageEl);

  try {
    await api(editingQuestionId ? `/api/admin/questions/${editingQuestionId}` : `/api/admin/courses/${courseId}/questions`, {
      method: editingQuestionId ? "PUT" : "POST",
      body: JSON.stringify(collectPayload())
    });
    resetForm();
    await loadQuestions();
    showMessage(messageEl, "Question saved successfully", "success");
  } catch (error) {
    showMessage(messageEl, error.message);
  }
});

document.getElementById("cancel-edit-btn")?.addEventListener("click", resetForm);

async function init() {
  if (!courseId) {
    window.location.href = "/pages/admin-courses.html";
    return;
  }
  const user = await requireRole("admin");
  if (!user) return;

  try {
    await loadQuestions();
  } catch (error) {
    showMessage(messageEl, error.message);
  }
}

init();
