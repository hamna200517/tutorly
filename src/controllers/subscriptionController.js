const Joi = require("joi");
const subscriptionService = require("../services/subscriptionService");
const HttpError = require("../utils/httpError");

const purchaseSchema = Joi.object({
  plan_type: Joi.string().valid("1m", "3m", "1y").required(),
  start_date: Joi.date().iso().optional(),
});

const topupSchema = Joi.object({
  amount: Joi.number().positive().required(),
});

exports.getPlans = async (req, res) => {
  const plans = subscriptionService.getPlans();
  res.json({
    success: true,
    data: {
      plans,
    },
  });
};

exports.purchaseTutorPlan = async (req, res) => {
  const { error, value } = purchaseSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid subscription purchase payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await subscriptionService.purchaseTutorSubscription(
    req.user.account_id,
    value.plan_type,
    value.start_date || null
  );

  res.status(201).json({
    success: true,
    data,
  });
};

exports.getMySubscriptions = async (req, res) => {
  const data = await subscriptionService.getMyTutorSubscriptions(req.user.account_id);
  res.json({
    success: true,
    data,
  });
};

exports.getTutorStatus = async (req, res) => {
  const data = await subscriptionService.getTutorSubscriptionStatus(req.user.account_id);
  res.json({
    success: true,
    data,
  });
};

exports.topupTutorWallet = async (req, res) => {
  const { error, value } = topupSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid top-up payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await subscriptionService.topupTutorWallet(req.user.account_id, value.amount);
  res.status(201).json({
    success: true,
    data,
  });
};

exports.purchaseAcademyPlan = async (req, res) => {
  const { error, value } = purchaseSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid academy subscription payload",
      error.details.map((d) => d.message)
    );
  }

  if (value.plan_type !== "1m") {
    throw new HttpError(400, "INVALID_PLAN", "Academy supports only monthly (1m) subscription");
  }

  const data = await subscriptionService.purchaseAcademySubscription(
    req.user.account_id,
    value.start_date || null
  );

  res.status(201).json({
    success: true,
    data,
  });
};

exports.getMyAcademySubscriptions = async (req, res) => {
  const data = await subscriptionService.getMyAcademySubscriptions(req.user.account_id);
  res.json({
    success: true,
    data,
  });
};

exports.getAcademyStatus = async (req, res) => {
  const data = await subscriptionService.getAcademySubscriptionStatus(req.user.account_id);
  res.json({
    success: true,
    data,
  });
};

exports.topupAcademyWallet = async (req, res) => {
  const { error, value } = topupSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid academy top-up payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await subscriptionService.topupAcademyWallet(req.user.account_id, value.amount);
  res.status(201).json({
    success: true,
    data,
  });
};
