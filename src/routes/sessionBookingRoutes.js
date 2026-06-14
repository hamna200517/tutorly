const express = require("express");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const sessionBookingController = require("../controllers/sessionBookingController");

const router = express.Router();

router.get("/slots/catalog", auth, rbac("student", "tutor"), sessionBookingController.getSlotCatalog);
router.get("/tutors", auth, rbac("student"), sessionBookingController.listTutors);
router.get("/tutors/:tutorId/slots", auth, rbac("student"), sessionBookingController.getTutorSlots);
router.post("/bookings", auth, rbac("student"), sessionBookingController.bookSession);
router.get("/bookings/my", auth, rbac("student", "tutor"), sessionBookingController.getMyBookings);
router.post("/bookings/:bookingId/confirm", auth, rbac("student", "tutor"), sessionBookingController.confirmSession);
router.post("/student/topup", auth, rbac("student"), sessionBookingController.topupStudentWallet);

module.exports = router;
