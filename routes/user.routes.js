const express = require("express");
const { requireUser } = require("../middleware/auth");
const {
  getResult,
  listCourses,
  startExam,
  submitExamController
} = require("../controllers/user.controller");

const router = express.Router();

router.get("/courses", requireUser, listCourses);
router.post("/exams/start", requireUser, startExam);
router.post("/exams/submit", requireUser, submitExamController);
router.get("/exams/:id/result", requireUser, getResult);

module.exports = router;
