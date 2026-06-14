const Joi = require("joi");
const chatService = require("../services/chatService");
const HttpError = require("../utils/httpError");

const sendSchema = Joi.object({
  receiver_account_id: Joi.number().integer().positive().required(),
  content: Joi.string().trim().min(1).max(2000).required(),
});

const threadQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

exports.send = async (req, res) => {
  const { error, value } = sendSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid chat message payload",
      error.details.map((d) => d.message)
    );
  }

  const data = await chatService.sendMessage(req.user.account_id, value.receiver_account_id, value.content);
  res.status(201).json({
    success: true,
    data,
  });
};

exports.conversations = async (req, res) => {
  const conversations = await chatService.listConversations(req.user.account_id);
  res.json({
    success: true,
    data: {
      conversations,
    },
  });
};

exports.thread = async (req, res) => {
  const peerAccountId = Number(req.params.peerAccountId);
  if (!Number.isInteger(peerAccountId) || peerAccountId <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid peer account id");
  }

  const { error, value } = threadQuerySchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid thread query parameters",
      error.details.map((d) => d.message)
    );
  }

  const data = await chatService.getThread(req.user.account_id, peerAccountId, value.limit, value.offset);
  res.json({
    success: true,
    data,
  });
};

exports.contacts = async (req, res) => {
  const contacts = await chatService.getChatContacts(req.user.account_id, req.user.role);
  res.json({ success: true, data: { contacts } });
};
