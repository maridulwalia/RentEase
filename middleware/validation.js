const Joi = require('joi');

const validateUser = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).required(),
    password: Joi.string().min(8).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

const validateItem = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(10).max(1000).required(),
    category: Joi.string().valid('books', 'electronics', 'tools', 'sports', 'music', 'photography', 'automotive', 'other').required(),
    dailyPrice: Joi.number().min(1).required(),
    condition: Joi.string().valid('new', 'like-new', 'good', 'fair', 'poor').optional(),
    location: Joi.object({
      address: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

const validateBooking = (req, res, next) => {
  const schema = Joi.object({
    itemId: Joi.string().required(),
    startDate: Joi.date().iso().min('now').required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    message: Joi.string().max(500).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

const validateReview = (req, res, next) => {
  const schema = Joi.object({
    bookingId: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().max(500).optional(),
    type: Joi.string().valid('item', 'user').required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

const validateComplaint = (req, res, next) => {
  const schema = Joi.object({
    defendantId: Joi.string().required(),
    bookingId: Joi.string().optional(),
    itemId: Joi.string().optional(),
    category: Joi.string().valid('item-damage', 'late-return', 'non-return', 'payment-issue', 'inappropriate-behavior', 'other').required(),
    subject: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(10).max(1000).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

module.exports = {
  validateUser,
  validateLogin,
  validateItem,
  validateBooking,
  validateReview,
  validateComplaint
};