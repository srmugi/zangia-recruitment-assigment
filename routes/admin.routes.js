const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const {
  createCourse,
  createQuestion,
  deleteCourse,
  deleteQuestion,
  getCourseResults,
  listCourses,
  listQuestions,
  updateCourse,
  updateQuestion
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(requireAdmin);

router.get("/courses", listCourses);
router.post("/courses", createCourse);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);

router.get("/courses/:courseId/questions", listQuestions);
router.post("/courses/:courseId/questions", createQuestion);
router.put("/questions/:id", updateQuestion);
router.delete("/questions/:id", deleteQuestion);

router.get("/courses/:courseId/results", getCourseResults);

module.exports = router;
