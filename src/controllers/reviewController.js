const Joi = require("joi");
const reviewService = require("../services/reviewService");
const HttpError = require("../utils/httpError");

const createSchema = Joi.object({
  booking_id: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().allow("", null).max(1000),
});

exports.create = async (req, res) => {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid review payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await reviewService.createReview({
    studentAccountId: req.user.account_id,
    bookingId: value.booking_id,
    rating: value.rating,
    comment: value.comment || null,
  });

  res.status(201).json({
    success: true,
    data,
  });
};

exports.myReviews = async (req, res) => {
  const data = await reviewService.getMyReviews(req.user.account_id, req.user.role);
  res.json({
    success: true,
    data,
  });
};
