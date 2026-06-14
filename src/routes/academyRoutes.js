const express = require("express");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const academyController = require("../controllers/academyController");

const router = express.Router();

router.get("/list", auth, rbac("student"), academyController.listAcademies);
router.get("/:academyId/courses", auth, rbac("student"), academyController.listCourses);
router.post("/enroll", auth, rbac("student"), academyController.enrollCourse);
router.get("/enrollments/my", auth, rbac("student", "academy"), academyController.getMyEnrollments);
router.post("/academy/courses/seed-demo", auth, rbac("academy"), academyController.seedCourses);

module.exports = router;
