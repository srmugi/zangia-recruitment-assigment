const { db } = require("../db/database");
const {
  createExam,
  getExamPayload,
  getExamResult,
  getRandomQuestionsForCourse,
  submitExam
} = require("../services/exam.service");

function listCourses(req, res) {
  const courses = db
    .prepare(
      `SELECT c.id, c.name, c.image, COUNT(q.id) AS question_count
       FROM courses c
       LEFT JOIN questions q ON q.course_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC, c.id DESC`
    )
    .all();
  res.json({ courses });
}

function startExam(req, res) {
  const courseId = Number(req.body.courseId);
  if (!courseId) {
    return res.status(400).json({ error: "Valid courseId is required" });
  }

  const course = db.prepare("SELECT id, name FROM courses WHERE id = ?").get(courseId);
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const questions = getRandomQuestionsForCourse(courseId);
  if (questions.length === 0) {
    return res.status(400).json({ error: "This course has no questions yet" });
  }

  const examId = createExam(req.session.user.id, courseId, questions);
  const payload = getExamPayload(examId);
  res.status(201).json(payload);
}

function submitExamController(req, res, next) {
  try {
    const examId = Number(req.body.examId);
    if (!examId) {
      return res.status(400).json({ error: "Valid examId is required" });
    }

    const result = submitExam({
      examId,
      userId: req.session.user.id,
      answers: req.body.answers,
      timeSpentSeconds: req.body.timeSpentSeconds
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

function getResult(req, res, next) {
  try {
    const examId = Number(req.params.id);
    const result = getExamResult(examId, req.session.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getResult,
  listCourses,
  startExam,
  submitExamController
};
