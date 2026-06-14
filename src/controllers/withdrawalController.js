const Joi = require("joi");
const withdrawalService = require("../services/withdrawalService");
const HttpError = require("../utils/httpError");

const requestSchema = Joi.object({
  amount: Joi.number().positive().required(),
  provider: Joi.string().valid("bank", "jazzcash", "easypaisa").required(),
  account_title: Joi.string().trim().min(2).max(100).required(),
  account_number: Joi.string().trim().min(5).max(40).required(),
  destination_note: Joi.string().trim().max(300).allow("", null),
});

const reviewSchema = Joi.object({
  decision: Joi.string().valid("approved", "rejected").required(),
  review_note: Joi.string().trim().max(300).allow("", null),
});

exports.requestTutorWithdrawal = async (req, res) => {
  const { error, value } = requestSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid withdrawal request payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await withdrawalService.requestTutorWithdrawal(req.user.account_id, value);
  res.status(201).json({
    success: true,
    data,
  });
};

exports.getMyTutorWithdrawals = async (req, res) => {
  const withdrawals = await withdrawalService.getMyTutorWithdrawals(req.user.account_id);
  res.json({
    success: true,
    data: {
      withdrawals,
    },
  });
};

exports.getPendingWithdrawals = async (req, res) => {
  const withdrawals = await withdrawalService.getPendingWithdrawalsForAdmin();
  res.json({
    success: true,
    data: {
      withdrawals,
    },
  });
};

exports.reviewWithdrawal = async (req, res) => {
  const withdrawalId = Number(req.params.withdrawalId);
  if (!Number.isInteger(withdrawalId) || withdrawalId <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid withdrawal id");
  }

  const { error, value } = reviewSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid review payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await withdrawalService.reviewWithdrawal(
    req.user.account_id,
    withdrawalId,
    value.decision,
    value.review_note || null
  );

  res.json({
    success: true,
    data,
  });
};
