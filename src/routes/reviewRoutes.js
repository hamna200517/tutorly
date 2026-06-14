const express = require("express");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

router.post("/", auth, rbac("student"), reviewController.create);
router.get("/my", auth, rbac("student", "tutor"), reviewController.myReviews);

module.exports = router;
