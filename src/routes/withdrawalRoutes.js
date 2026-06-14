const express = require("express");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const withdrawalController = require("../controllers/withdrawalController");

const router = express.Router();

router.post("/request", auth, rbac("tutor"), withdrawalController.requestTutorWithdrawal);
router.get("/my", auth, rbac("tutor"), withdrawalController.getMyTutorWithdrawals);
router.get("/admin/pending", auth, rbac("admin"), withdrawalController.getPendingWithdrawals);
router.patch("/admin/:withdrawalId/review", auth, rbac("admin"), withdrawalController.reviewWithdrawal);

module.exports = router;
