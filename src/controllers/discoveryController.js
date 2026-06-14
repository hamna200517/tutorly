const Joi = require("joi");
const discoveryService = require("../services/discoveryService");
const HttpError = require("../utils/httpError");

const querySchema = Joi.object({
  subject: Joi.string().trim().min(1).max(100),
  location: Joi.string().trim().min(1).max(100),
  teaching_mode: Joi.string().valid("online", "physical", "hybrid"),
  min_rating: Joi.number().min(0).max(5),
  min_price: Joi.number().min(0),
  max_price: Joi.number().min(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

function validatePriceRange(minPrice, maxPrice) {
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new HttpError(400, "VALIDATION_ERROR", "min_price cannot be greater than max_price");
  }
}

exports.searchTutors = async (req, res) => {
  const { error, value } = querySchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid tutor discovery filters",
      error.details.map((d) => d.message)
    );
  }

  validatePriceRange(value.min_price, value.max_price);
  const tutors = await discoveryService.discoverTutors(value);
  res.json({
    success: true,
    data: {
      filters: value,
      count: tutors.length,
      tutors,
    },
  });
};

exports.searchAcademies = async (req, res) => {
  const { error, value } = querySchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid academy discovery filters",
      error.details.map((d) => d.message)
    );
  }

  validatePriceRange(value.min_price, value.max_price);
  const academies = await discoveryService.discoverAcademies(value);
  res.json({
    success: true,
    data: {
      filters: value,
      count: academies.length,
      academies,
    },
  });
};
