const Joi = require('joi');

exports.airtimeSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9+\- ]{6,20}$/).required(),
  amount: Joi.number().positive().required(),
  provider: Joi.string().required(),
  pinHash: Joi.string().optional(),
  idempotencyKey: Joi.string().optional()
});

exports.dataSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9+\- ]{6,20}$/).required(),
  planId: Joi.string().required(),
  provider: Joi.string().required(),
  amount: Joi.number().positive().required(),
  pinHash: Joi.string().optional(),
  idempotencyKey: Joi.string().optional()
});

exports.electricitySchema = Joi.object({
  meterNumber: Joi.string().required(),
  amount: Joi.number().positive().required(),
  disco: Joi.string().required(),
  meterType: Joi.string().valid('prepaid','postpaid').required(),
  pinHash: Joi.string().optional(),
  idempotencyKey: Joi.string().optional()
});

exports.cableSchema = Joi.object({
  smartcardNumber: Joi.string().required(),
  amount: Joi.number().positive().required(),
  provider: Joi.string().required(),
  planId: Joi.string().required(),
  pinHash: Joi.string().optional(),
  idempotencyKey: Joi.string().optional()
});

exports.internetSchema = Joi.object({
  customerId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  provider: Joi.string().required(),
  planId: Joi.string().required(),
  pinHash: Joi.string().optional(),
  idempotencyKey: Joi.string().optional()
});

exports.depositSchema = Joi.object({
  amount: Joi.number().positive().min(100).required(),
  idempotencyKey: Joi.string().optional()
});

exports.withdrawSchema = Joi.object({
  amount: Joi.number().positive().required(),
  bankName: Joi.string().required(),
  accountNumber: Joi.string().required(),
  accountName: Joi.string().required(),
  idempotencyKey: Joi.string().optional()
});
