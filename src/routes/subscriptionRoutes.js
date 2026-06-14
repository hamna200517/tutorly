const express = require("express");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const subscriptionController = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/plans", subscriptionController.getPlans);
router.get("/tutor/status", auth, rbac("tutor"), subscriptionController.getTutorStatus);
router.post("/tutor/topup", auth, rbac("tutor"), subscriptionController.topupTutorWallet);
router.post("/tutor/purchase", auth, rbac("tutor"), subscriptionController.purchaseTutorPlan);
router.get("/tutor/my", auth, rbac("tutor"), subscriptionController.getMySubscriptions);
router.get("/academy/status", auth, rbac("academy"), subscriptionController.getAcademyStatus);
router.post("/academy/topup", auth, rbac("academy"), subscriptionController.topupAcademyWallet);
router.post("/academy/purchase", auth, rbac("academy"), subscriptionController.purchaseAcademyPlan);
router.get("/academy/my", auth, rbac("academy"), subscriptionController.getMyAcademySubscriptions);

module.exports = router;
