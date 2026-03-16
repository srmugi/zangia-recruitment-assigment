import { api, clearMessage, escapeHtml, formatDuration, requireRole, showMessage } from "./common.js";

const examData = JSON.parse(sessionStorage.getItem("activeExam") || "null");
const courseTitleEl = document.getElementById("course-title");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const questionContainer = document.getElementById("questions");
const submitBtn = document.getElementById("submit-btn");
const messageEl = document.getElementById("message");

let selectedAnswers = new Map();
let timerStarted = false;
let timerInterval = null;
let delayedStart = null;
let remainingSeconds = 600;
let startedAtMs = null;
let submitting = false;

function renderQuestionMedia(question) {
  let html = "";
  if (question.image) {
    html += `<div class="media-frame"><img src="${escapeHtml(question.image)}" alt="Question image"></div>`;
  }
  if (question.audio) {
    html += `<div class="media-frame"><audio controls src="${escapeHtml(question.audio)}"></audio></div>`;
  }
  if (question.video) {
    html += `<div class="media-frame"><video controls src="${escapeHtml(question.video)}"></video></div>`;
  }
  return html;
}

function renderQuestions() {
  questionContainer.innerHTML = examData.questions
    .map(
      (question, index) => `
        <article class="card question-card" data-question-id="${question.id}">
          <h3>Question ${index + 1}</h3>
          ${question.text ? `<p>${escapeHtml(question.text)}</p>` : ""}
          ${renderQuestionMedia(question)}
          <div class="answers-list">
            ${question.answers
              .map(
                (answer) => `
                  <label class="answer-option" data-answer-id="${answer.id}">
                    <input type="radio" name="question-${question.id}" value="${answer.id}">
                    <span>${escapeHtml(answer.text)}</span>
                  </label>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");

  questionContainer.querySelectorAll("input[type='radio']").forEach((input) => {
    input.addEventListener("change", () => {
      const questionId = Number(input.name.replace("question-", ""));
      const selectedAnswerId = Number(input.value);
      selectedAnswers.set(questionId, selectedAnswerId);

      if (!timerStarted) {
        startTimer();
      }

      input
        .closest(".answers-list")
        .querySelectorAll(".answer-option")
        .forEach((option) => option.classList.remove("selected"));
      input.closest(".answer-option").classList.add("selected");
      updateStatus();
    });
  });
}

function updateTimer() {
  timerEl.textContent = formatDuration(remainingSeconds);
  timerEl.classList.toggle("danger", remainingSeconds < 10);
}

function updateStatus() {
  statusEl.textContent = `${selectedAnswers.size} of ${examData.questions.length} answered`;
}

function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  startedAtMs = Date.now();
  clearTimeout(delayedStart);
  timerInterval = window.setInterval(() => {
    remainingSeconds -= 1;
    updateTimer();
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearInterval(timerInterval);
      submitExam(true);
    }
  }, 1000);
  updateTimer();
}

async function submitExam(autoSubmitted = false) {
  if (submitting) return;
  submitting = true;
  clearMessage(messageEl);
  submitBtn.disabled = true;
  clearInterval(timerInterval);
  clearTimeout(delayedStart);

  const timeSpentSeconds = timerStarted && startedAtMs
    ? Math.min(600, Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)))
    : 0;

  const answers = examData.questions.map((question) => ({
    questionId: question.id,
    selectedAnswerId: selectedAnswers.get(question.id) || null
  }));

  try {
    const result = await api("/api/exams/submit", {
      method: "POST",
      body: JSON.stringify({
        examId: examData.examId,
        answers,
        timeSpentSeconds
      })
    });
    sessionStorage.removeItem("activeExam");
    sessionStorage.setItem("lastExamResult", JSON.stringify(result));
    window.location.href = "/pages/result.html";
  } catch (error) {
    submitting = false;
    submitBtn.disabled = false;
    showMessage(messageEl, autoSubmitted ? `Auto-submit failed: ${error.message}` : error.message);
  }
}

async function init() {
  const user = await requireRole("user");
  if (!user) return;

  if (!examData || !Array.isArray(examData.questions)) {
    window.location.href = "/pages/courses.html";
    return;
  }

  courseTitleEl.textContent = examData.course.name;
  renderQuestions();
  updateTimer();
  updateStatus();
  delayedStart = window.setTimeout(startTimer, 5000);

  submitBtn.addEventListener("click", () => submitExam(false));
}

init();
