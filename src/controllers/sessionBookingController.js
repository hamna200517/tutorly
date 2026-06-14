const Joi = require("joi");
const sessionBookingService = require("../services/sessionBookingService");
const HttpError = require("../utils/httpError");

const isoDateString = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const slotsQuerySchema = Joi.object({
  date: isoDateString.required(),
});

const bookSchema = Joi.object({
  tutor_id: Joi.number().integer().positive().required(),
  date: isoDateString.required(),
  slot_id: Joi.string().valid("s1", "s2", "s3", "s4").required(),
});

const confirmSchema = Joi.object({
  confirmed: Joi.boolean().required(),
});

const topupSchema = Joi.object({
  amount: Joi.number().positive().required(),
});

exports.listTutors = async (req, res) => {
  const tutors = await sessionBookingService.listAvailableTutors();
  res.json({
    success: true,
    data: {
      tutors,
    },
  });
};

exports.getTutorSlots = async (req, res) => {
  const { error, value } = slotsQuerySchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid slots query",
      error.details.map((d) => d.message)
    );
  }

  const tutorId = Number(req.params.tutorId);
  if (!Number.isInteger(tutorId) || tutorId <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid tutor id");
  }

  const slots = await sessionBookingService.getTutorSlots(tutorId, value.date);
  res.json({
    success: true,
    data: {
      tutor_id: tutorId,
      date: value.date,
      slots,
    },
  });
};

exports.bookSession = async (req, res) => {
  const { error, value } = bookSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid booking payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await sessionBookingService.bookTutorSession({
    studentAccountId: req.user.account_id,
    tutorId: value.tutor_id,
    date: value.date,
    slotId: value.slot_id,
  });

  res.status(201).json({
    success: true,
    data,
  });
};

exports.confirmSession = async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid booking id");
  }

  const { error, value } = confirmSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid confirmation payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await sessionBookingService.confirmSession({
    accountId: req.user.account_id,
    role: req.user.role,
    bookingId,
    confirmed: value.confirmed,
  });

  res.json({
    success: true,
    data,
  });
};

exports.topupStudentWallet = async (req, res) => {
  const { error, value } = topupSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid top-up payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await sessionBookingService.topupStudentWallet(req.user.account_id, value.amount);
  res.status(201).json({
    success: true,
    data,
  });
};

exports.getMyBookings = async (req, res) => {
  const data = await sessionBookingService.getMyBookings(req.user.account_id, req.user.role);
  res.json({
    success: true,
    data: {
      bookings: data,
    },
  });
};

exports.getSlotCatalog = async (req, res) => {
  res.json({
    success: true,
    data: {
      slots: sessionBookingService.FIXED_SLOTS,
      price_per_session: Number(process.env.SESSION_PRICE || 1000),
      currency: "PKR",
    },
  });
};
