const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  createReview,
  getItemReviews,
  getUserReviews,
  reportReview,
  getMyReviews
} = require('../controllers/reviewController');

const router = express.Router();

// Validation rules
const reviewValidation = [
  body('bookingId')
    .isMongoId()
    .withMessage('Please provide a valid booking ID'),
  body('type')
    .isIn(['item', 'user'])
    .withMessage('Review type must be either item or user'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters')
];

const reportValidation = [
  body('reason')
    .isIn(['inappropriate', 'spam', 'fake', 'offensive', 'other'])
    .withMessage('Please provide a valid report reason')
];

// Public routes
router.get('/item/:itemId', getItemReviews);
router.get('/user/:userId', getUserReviews);

// Protected routes
router.use(auth);
router.post('/', reviewValidation, createReview);
router.get('/my-reviews', getMyReviews);
router.post('/:id/report', reportValidation, reportReview);

module.exports = router;