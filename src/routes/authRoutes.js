const express = require("express");
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/resend-verification", authController.resendVerification);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", auth, authController.me);
router.post("/logout", auth, authController.logout);
router.get("/rbac/student", auth, rbac("student"), (req, res) => {
  res.json({ success: true, data: { message: "student access granted", role: req.user.role } });
});

router.get("/rbac/tutor", auth, rbac("tutor"), (req, res) => {
  res.json({ success: true, data: { message: "tutor access granted", role: req.user.role } });
});

router.get("/rbac/academy", auth, rbac("academy"), (req, res) => {
  res.json({ success: true, data: { message: "academy access granted", role: req.user.role } });
});

router.get("/rbac/admin", auth, rbac("admin"), (req, res) => {
  res.json({ success: true, data: { message: "admin access granted", role: req.user.role } });
});

module.exports = router;
