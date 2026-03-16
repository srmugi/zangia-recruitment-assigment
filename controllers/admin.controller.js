const { db } = require("../db/database");

function listCourses(req, res) {
  const courses = db
    .prepare(
      `SELECT c.id, c.name, c.image,
              COUNT(DISTINCT q.id) AS question_count,
              COUNT(DISTINCT e.id) AS exam_count
       FROM courses c
       LEFT JOIN questions q ON q.course_id = c.id
       LEFT JOIN exams e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC, c.id DESC`
    )
    .all();
  res.json({ courses });
}

function createCourse(req, res) {
  const { name, image } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Course name is required" });
  }

  const result = db.prepare("INSERT INTO courses (name, image) VALUES (?, ?)").run(name.trim(), image || null);
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ course });
}

function updateCourse(req, res) {
  const courseId = Number(req.params.id);
  const { name, image } = req.body;
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Course name is required" });
  }

  db.prepare("UPDATE courses SET name = ?, image = ? WHERE id = ?").run(name.trim(), image || null, courseId);
  res.json({ success: true });
}

function deleteCourse(req, res) {
  const courseId = Number(req.params.id);
  const result = db.prepare("DELETE FROM courses WHERE id = ?").run(courseId);
  if (!result.changes) {
    return res.status(404).json({ error: "Course not found" });
  }
  res.json({ success: true });
}

function listQuestions(req, res) {
  const courseId = Number(req.params.courseId);
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const questions = db
    .prepare(
      `SELECT id, course_id, text, image, audio, video, created_at
       FROM questions
       WHERE course_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(courseId)
    .map((question) => ({
      ...question,
      answers: db
        .prepare("SELECT id, text, is_correct FROM answers WHERE question_id = ? ORDER BY id ASC")
        .all(question.id)
    }));

  res.json({ course, questions });
}

function validateQuestionPayload(body) {
  const text = body.text ? body.text.trim() : "";
  const image = body.image ? body.image.trim() : "";
  const audio = body.audio ? body.audio.trim() : "";
  const video = body.video ? body.video.trim() : "";
  const correctAnswer = body.correctAnswer ? body.correctAnswer.trim() : "";
  const incorrectAnswers = Array.isArray(body.incorrectAnswers)
    ? body.incorrectAnswers.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  if (!text && !image && !audio && !video) {
    return "At least one question content field is required";
  }
  if (!correctAnswer) {
    return "Correct answer is required";
  }
  if (incorrectAnswers.length < 1 || incorrectAnswers.length > 5) {
    return "Provide between 1 and 5 incorrect answers";
  }
  return null;
}

function createQuestion(req, res) {
  const courseId = Number(req.params.courseId);
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const validationError = validateQuestionPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { text, image, audio, video, correctAnswer, incorrectAnswers } = req.body;
  const insertQuestion = db.prepare(
    "INSERT INTO questions (course_id, text, image, audio, video) VALUES (?, ?, ?, ?, ?)"
  );
  const insertAnswer = db.prepare(
    "INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    const result = insertQuestion.run(courseId, text || null, image || null, audio || null, video || null);
    const questionId = result.lastInsertRowid;

    insertAnswer.run(questionId, correctAnswer.trim(), 1);
    incorrectAnswers
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .forEach((answer) => insertAnswer.run(questionId, answer, 0));
  });

  transaction();
  res.status(201).json({ success: true });
}

function updateQuestion(req, res) {
  const questionId = Number(req.params.id);
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId);
  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  const validationError = validateQuestionPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { text, image, audio, video, correctAnswer, incorrectAnswers } = req.body;

  const transaction = db.transaction(() => {
    db.prepare("UPDATE questions SET text = ?, image = ?, audio = ?, video = ? WHERE id = ?").run(
      text || null,
      image || null,
      audio || null,
      video || null,
      questionId
    );
    db.prepare("DELETE FROM answers WHERE question_id = ?").run(questionId);
    db.prepare("INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, 1)").run(
      questionId,
      correctAnswer.trim()
    );
    incorrectAnswers
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .forEach((answer) => {
        db.prepare("INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, 0)").run(
          questionId,
          answer
        );
      });
  });

  transaction();
  res.json({ success: true });
}

function deleteQuestion(req, res) {
  const questionId = Number(req.params.id);
  const result = db.prepare("DELETE FROM questions WHERE id = ?").run(questionId);
  if (!result.changes) {
    return res.status(404).json({ error: "Question not found" });
  }
  res.json({ success: true });
}

function getCourseResults(req, res) {
  const courseId = Number(req.params.courseId);
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const results = db
    .prepare(
      `SELECT e.id, e.user_id, u.first_name, u.last_name, u.email, u.phone,
              e.correct_count, e.incorrect_count, e.answered_count,
              e.score, e.total_questions, e.submitted_at, e.duration_seconds
       FROM exams e
       JOIN users u ON u.id = e.user_id
       WHERE e.course_id = ? AND e.submitted_at IS NOT NULL
       ORDER BY e.submitted_at DESC, e.id DESC`
    )
    .all(courseId)
    .map((row) => ({
      ...row,
      user_name: `${row.first_name} ${row.last_name}`.trim()
    }));

  res.json({ course, results });
}

module.exports = {
  createCourse,
  createQuestion,
  deleteCourse,
  deleteQuestion,
  getCourseResults,
  listCourses,
  listQuestions,
  updateCourse,
  updateQuestion
};
