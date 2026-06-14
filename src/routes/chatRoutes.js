const express = require("express");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const chatController = require("../controllers/chatController");

const router = express.Router();

router.post("/messages", auth, rbac("student", "tutor", "academy"), chatController.send);
router.get("/conversations", auth, rbac("student", "tutor", "academy"), chatController.conversations);
router.get("/contacts", auth, rbac("student", "tutor", "academy"), chatController.contacts);
router.get("/messages/:peerAccountId", auth, rbac("student", "tutor", "academy"), chatController.thread);

module.exports = router;
