const express = require("express");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const discoveryController = require("../controllers/discoveryController");

const router = express.Router();

router.get("/tutors", auth, rbac("student"), discoveryController.searchTutors);
router.get("/academies", auth, rbac("student"), discoveryController.searchAcademies);

module.exports = router;
