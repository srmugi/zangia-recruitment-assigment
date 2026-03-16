const { db } = require("../db/database");

function shuffle(array) {
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function getRandomQuestionsForCourse(courseId) {
  return db
    .prepare(
      `SELECT id, text, image, audio, video
       FROM questions
       WHERE course_id = ?
       ORDER BY RANDOM()
       LIMIT 10`
    )
    .all(courseId);
}

function createExam(userId, courseId, questions) {
  const insertExam = db.prepare(
    "INSERT INTO exams (user_id, course_id, total_questions) VALUES (?, ?, ?)"
  );
  const insertExamQuestion = db.prepare(
    "INSERT INTO exam_questions (exam_id, question_id) VALUES (?, ?)"
  );

  const transaction = db.transaction(() => {
    const examResult = insertExam.run(userId, courseId, questions.length);
    const examId = examResult.lastInsertRowid;

    questions.forEach((question) => {
      insertExamQuestion.run(examId, question.id);
    });

    return examId;
  });

  return transaction();
}

function getExamPayload(examId) {
  const exam = db.prepare("SELECT id, course_id, started_at FROM exams WHERE id = ?").get(examId);
  const course = db.prepare("SELECT id, name FROM courses WHERE id = ?").get(exam.course_id);
  const questions = db
    .prepare(
      `SELECT q.id, q.text, q.image, q.audio, q.video
       FROM exam_questions eq
       JOIN questions q ON q.id = eq.question_id
       WHERE eq.exam_id = ?`
    )
    .all(examId)
    .map((question) => {
      const answers = db
        .prepare("SELECT id, text FROM answers WHERE question_id = ?")
        .all(question.id);
      return {
        ...question,
        answers: shuffle(answers)
      };
    });

  return {
    examId: exam.id,
    startedAt: exam.started_at,
    course,
    questions
  };
}

function submitExam({ examId, userId, answers, timeSpentSeconds }) {
  const exam = db
    .prepare("SELECT * FROM exams WHERE id = ? AND user_id = ?")
    .get(examId, userId);

  if (!exam) {
    const error = new Error("Exam not found");
    error.status = 404;
    throw error;
  }

  if (exam.submitted_at) {
    return getExamResult(examId, userId);
  }

  const questionRows = db
    .prepare(
      `SELECT q.id, q.text, q.image, q.audio, q.video
       FROM exam_questions eq
       JOIN questions q ON q.id = eq.question_id
       WHERE eq.exam_id = ?`
    )
    .all(examId);

  const validQuestionIds = new Set(questionRows.map((row) => row.id));
  const sanitizedAnswers = Array.isArray(answers)
    ? answers.filter((item) => validQuestionIds.has(item.questionId))
    : [];

  const getCorrectAnswer = db.prepare(
    "SELECT id, text FROM answers WHERE question_id = ? AND is_correct = 1"
  );
  const getAnswerById = db.prepare(
    "SELECT id, text FROM answers WHERE id = ? AND question_id = ?"
  );
  const insertExamAnswer = db.prepare(
    `INSERT INTO exam_answers (exam_id, question_id, selected_answer_id, is_correct)
     VALUES (?, ?, ?, ?)`
  );
  const updateExam = db.prepare(
    `UPDATE exams
     SET submitted_at = CURRENT_TIMESTAMP,
         score = ?,
         correct_count = ?,
         incorrect_count = ?,
         answered_count = ?,
         duration_seconds = ?
     WHERE id = ?`
  );

  const answersByQuestion = new Map();
  sanitizedAnswers.forEach((item) => {
    answersByQuestion.set(item.questionId, item.selectedAnswerId || null);
  });

  const transaction = db.transaction(() => {
    let correctCount = 0;
    let incorrectCount = 0;
    let answeredCount = 0;

    questionRows.forEach((question) => {
      const correctAnswer = getCorrectAnswer.get(question.id);
      const rawSelectedAnswerId = answersByQuestion.has(question.id)
        ? answersByQuestion.get(question.id)
        : null;
      let selectedAnswerId = null;
      let isCorrect = 0;

      if (rawSelectedAnswerId) {
        const selectedAnswer = getAnswerById.get(rawSelectedAnswerId, question.id);
        if (selectedAnswer) {
          selectedAnswerId = selectedAnswer.id;
          answeredCount += 1;
          isCorrect = selectedAnswer.id === correctAnswer.id ? 1 : 0;
        }
      }

      if (isCorrect) {
        correctCount += 1;
      } else if (selectedAnswerId) {
        incorrectCount += 1;
      }

      insertExamAnswer.run(examId, question.id, selectedAnswerId, isCorrect);
    });

    const durationSeconds = Math.max(
      0,
      Math.min(600, Number.isFinite(timeSpentSeconds) ? Math.floor(timeSpentSeconds) : 0)
    );

    updateExam.run(
      correctCount,
      correctCount,
      incorrectCount,
      answeredCount,
      durationSeconds,
      examId
    );
  });

  transaction();
  return getExamResult(examId, userId);
}

function getExamResult(examId, userId) {
  const exam = db
    .prepare(
      `SELECT e.*, c.name AS course_name
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       WHERE e.id = ? AND e.user_id = ?`
    )
    .get(examId, userId);

  if (!exam) {
    const error = new Error("Exam result not found");
    error.status = 404;
    throw error;
  }

  const rows = db
    .prepare(
      `SELECT q.id AS question_id, q.text AS question_text, q.image, q.audio, q.video,
              ea.selected_answer_id, ea.is_correct,
              sa.text AS selected_answer_text,
              ca.text AS correct_answer_text
       FROM exam_answers ea
       JOIN questions q ON q.id = ea.question_id
       LEFT JOIN answers sa ON sa.id = ea.selected_answer_id
       LEFT JOIN answers ca ON ca.question_id = q.id AND ca.is_correct = 1
       WHERE ea.exam_id = ?`
    )
    .all(examId);

  return {
    exam: {
      id: exam.id,
      courseId: exam.course_id,
      courseName: exam.course_name,
      startedAt: exam.started_at,
      submittedAt: exam.submitted_at,
      score: exam.score,
      totalQuestions: exam.total_questions,
      correctCount: exam.correct_count,
      incorrectCount: exam.incorrect_count,
      answeredCount: exam.answered_count,
      unansweredCount: exam.total_questions - exam.answered_count,
      durationSeconds: exam.duration_seconds
    },
    review: rows.map((row) => ({
      questionId: row.question_id,
      questionText: row.question_text,
      image: row.image,
      audio: row.audio,
      video: row.video,
      selectedAnswer: row.selected_answer_text,
      correctAnswer: row.correct_answer_text,
      isCorrect: Boolean(row.is_correct)
    }))
  };
}

module.exports = {
  createExam,
  getExamPayload,
  getExamResult,
  getRandomQuestionsForCourse,
  submitExam
};
