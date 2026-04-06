const express = require('express');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Item = require('../models/Item');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateReview } = require('../middleware/validation');
const { moderateContent } = require('../utils/profanityFilter');
const router = express.Router();

// @route   POST /api/reviews
// @desc    Create a review for an item or user
// @access  Private
router.post('/', auth, validateReview, async (req, res) => {
  try {
    const { bookingId, rating, comment, type } = req.body;

    // Check if booking exists and user is involved
    const booking = await Booking.findById(bookingId)
      .populate('item')
      .populate('borrower')
      .populate('lender');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is involved in this booking
    if (booking.borrower._id.toString() !== req.user.id && 
        booking.lender._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to review this booking'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only review completed bookings'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      booking: bookingId,
      reviewer: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this booking'
      });
    }

    // Determine reviewee based on type and user role
    let reviewee;
    if (type === 'item') {
      reviewee = booking.lender._id;
    } else if (type === 'user') {
      // If borrower is reviewing, reviewee is lender and vice versa
      reviewee = booking.borrower._id.toString() === req.user.id 
        ? booking.lender._id 
        : booking.borrower._id;
    }

    // Moderate comment content
    let moderatedComment = comment;
    let moderationFlag = 'clean';
    
    if (comment) {
      const moderation = moderateContent(comment);
      moderatedComment = moderation.moderatedContent;
      moderationFlag = moderation.moderationFlag;
    }

    // Create review
    const review = new Review({
      booking: bookingId,
      item: booking.item._id,
      reviewer: req.user.id,
      reviewee,
      rating,
      comment: moderatedComment,
      type,
      moderationFlag
    });

    await review.save();

    // Update item or user rating
    if (type === 'item') {
      await booking.item.updateRating(rating);
    } else if (type === 'user') {
      const revieweeUser = await User.findById(reviewee);
      await revieweeUser.updateRating(rating);
    }

    await review.populate([
      { path: 'reviewer', select: 'name profilePicture' },
      { path: 'reviewee', select: 'name profilePicture' },
      { path: 'item', select: 'title' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully',
      data: { review }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/reviews/item/:itemId
// @desc    Get reviews for a specific item
// @access  Public
router.get('/item/:itemId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ 
      item: req.params.itemId,
      type: 'item'
    })
      .populate('reviewer', 'name profilePicture')
      .populate('booking', 'startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({ 
      item: req.params.itemId,
      type: 'item'
    });

    res.json({
      status: 'success',
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/reviews/user/:userId
// @desc    Get reviews for a specific user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ 
      reviewee: req.params.userId,
      type: 'user'
    })
      .populate('reviewer', 'name profilePicture')
      .populate('item', 'title')
      .populate('booking', 'startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({ 
      reviewee: req.params.userId,
      type: 'user'
    });

    res.json({
      status: 'success',
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/reviews/my-reviews
// @desc    Get user's reviews (given and received)
// @access  Private
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const type = req.query.type; // 'given' or 'received'

    let query = {};
    if (type === 'given') {
      query.reviewer = req.user.id;
    } else if (type === 'received') {
      query.reviewee = req.user.id;
    } else {
      query.$or = [
        { reviewer: req.user.id },
        { reviewee: req.user.id }
      ];
    }

    const reviews = await Review.find(query)
      .populate('reviewer', 'name profilePicture')
      .populate('reviewee', 'name profilePicture')
      .populate('item', 'title images')
      .populate('booking', 'startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/reviews/:id
// @desc    Get single review
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewer', 'name profilePicture')
      .populate('reviewee', 'name profilePicture')
      .populate('item', 'title images')
      .populate('booking', 'startDate endDate');

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    res.json({
      status: 'success',
      data: { review }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update review (only reviewer can update)
// @access  Private
router.put('/:id', auth, validateReview, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    // Check if user is the reviewer
    if (review.reviewer.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this review'
      });
    }

    // Moderate comment content
    let moderatedComment = comment;
    let moderationFlag = 'clean';
    
    if (comment) {
      const moderation = moderateContent(comment);
      moderatedComment = moderation.moderatedContent;
      moderationFlag = moderation.moderationFlag;
    }

    const oldRating = review.rating;
    
    review.rating = rating;
    review.comment = moderatedComment;
    review.moderationFlag = moderationFlag;
    
    await review.save();

    // Update item or user rating if rating changed
    if (oldRating !== rating) {
      if (review.type === 'item') {
        const item = await Item.findById(review.item);
        // Recalculate rating (subtract old, add new)
        const totalRating = (item.rating.average * item.rating.count) - oldRating + rating;
        item.rating.average = totalRating / item.rating.count;
        await item.save();
      } else if (review.type === 'user') {
        const user = await User.findById(review.reviewee);
        // Recalculate rating (subtract old, add new)
        const totalRating = (user.rating.average * user.rating.count) - oldRating + rating;
        user.rating.average = totalRating / user.rating.count;
        await user.save();
      }
    }

    await review.populate([
      { path: 'reviewer', select: 'name profilePicture' },
      { path: 'reviewee', select: 'name profilePicture' },
      { path: 'item', select: 'title' }
    ]);

    res.json({
      status: 'success',
      message: 'Review updated successfully',
      data: { review }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete review (only reviewer can delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    // Check if user is the reviewer
    if (review.reviewer.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this review'
      });
    }

    // Update item or user rating (remove this review's contribution)
    if (review.type === 'item') {
      const item = await Item.findById(review.item);
      if (item.rating.count > 1) {
        const totalRating = (item.rating.average * item.rating.count) - review.rating;
        item.rating.count -= 1;
        item.rating.average = totalRating / item.rating.count;
      } else {
        item.rating.average = 0;
        item.rating.count = 0;
      }
      await item.save();
    } else if (review.type === 'user') {
      const user = await User.findById(review.reviewee);
      if (user.rating.count > 1) {
        const totalRating = (user.rating.average * user.rating.count) - review.rating;
        user.rating.count -= 1;
        user.rating.average = totalRating / user.rating.count;
      } else {
        user.rating.average = 0;
        user.rating.count = 0;
      }
      await user.save();
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;