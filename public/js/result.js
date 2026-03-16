import { escapeHtml, formatDuration, requireRole, showMessage } from "./common.js";

const resultRoot = document.getElementById("result-root");
const reviewRoot = document.getElementById("review-root");
const messageEl = document.getElementById("message");

function renderMedia(review) {
  let html = "";
  if (review.image) {
    html += `<div class="media-frame"><img src="${escapeHtml(review.image)}" alt="Question image"></div>`;
  }
  if (review.audio) {
    html += `<div class="media-frame"><audio controls src="${escapeHtml(review.audio)}"></audio></div>`;
  }
  if (review.video) {
    html += `<div class="media-frame"><video controls src="${escapeHtml(review.video)}"></video></div>`;
  }
  return html;
}

async function init() {
  const user = await requireRole("user");
  if (!user) return;

  const result = JSON.parse(sessionStorage.getItem("lastExamResult") || "null");
  if (!result) {
    showMessage(messageEl, "No exam result found");
    return;
  }

  const { exam, review } = result;
  resultRoot.innerHTML = `
    <div class="card panel">
      <h2>${escapeHtml(exam.courseName)} Result</h2>
      <p class="muted">Submitted at ${escapeHtml(exam.submittedAt || "")}</p>
      <div class="form-grid">
        <div>Total questions: <strong>${exam.totalQuestions}</strong></div>
        <div>Answered: <strong>${exam.answeredCount}</strong></div>
        <div>Unanswered: <strong>${exam.unansweredCount}</strong></div>
        <div>Correct: <strong>${exam.correctCount}</strong></div>
        <div>Incorrect: <strong>${exam.incorrectCount}</strong></div>
        <div>Score: <strong>${exam.score}</strong></div>
        <div>Time spent: <strong>${formatDuration(exam.durationSeconds)}</strong></div>
      </div>
    </div>
  `;

  reviewRoot.innerHTML = review
    .map(
      (item, index) => `
        <article class="card review-card">
          <div class="header-row">
            <h3>Question ${index + 1}</h3>
            <span class="pill ${item.isCorrect ? "success" : "danger"}">${item.isCorrect ? "Correct" : "Incorrect"}</span>
          </div>
          ${item.questionText ? `<p>${escapeHtml(item.questionText)}</p>` : ""}
          ${renderMedia(item)}
          <p><strong>Selected:</strong> ${escapeHtml(item.selectedAnswer || "No answer")}</p>
          <p><strong>Correct answer:</strong> ${escapeHtml(item.correctAnswer)}</p>
        </article>
      `
    )
    .join("");
}

init();
