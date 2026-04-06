const express = require('express');
const Booking = require('../models/Booking');
const Item = require('../models/Item');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateBooking } = require('../middleware/validation');
const { processPayment, creditWallet } = require('../utils/payment');
const router = express.Router();

// @route   POST /api/bookings
// @desc    Create new booking request
// @access  Private
router.post('/', auth, validateBooking, async (req, res) => {
  try {
    const { itemId, startDate, endDate, message } = req.body;

    // Check if item exists and is available
    const item = await Item.findById(itemId).populate('owner');
    if (!item || !item.isActive || !item.isAvailable) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found or not available'
      });
    }

    // Check if user is trying to book their own item
    if (item.owner._id.toString() === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot book your own item'
      });
    }

    // Calculate booking details
    const start = new Date(startDate);
    const end = new Date(endDate);
    const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const booking = new Booking({
      item: itemId,
      borrower: req.user.id,
      lender: item.owner._id,
      startDate: start,
      endDate: end,
      numberOfDays,
      dailyPrice: item.dailyPrice,
      message
    });

    // Calculate totals
    booking.calculateTotals();

    // Check if borrower has sufficient balance for upfront fee
    const borrower = await User.findById(req.user.id);
    if (borrower.walletBalance < booking.upfrontFee) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient wallet balance for upfront booking fee',
        required: booking.upfrontFee,
        available: borrower.walletBalance
      });
    }

    await booking.save();
    await booking.populate([
      { path: 'item', select: 'title images dailyPrice' },
      { path: 'borrower', select: 'name email phone' },
      { path: 'lender', select: 'name email phone' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Booking request created successfully',
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/bookings
// @desc    Get user's bookings (both as borrower and lender)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const role = req.query.role; // 'borrower', 'lender', or undefined for both

    let query = {};
    if (role === 'borrower') {
      query.borrower = req.user.id;
    } else if (role === 'lender') {
      query.lender = req.user.id;
    } else {
      query.$or = [
        { borrower: req.user.id },
        { lender: req.user.id }
      ];
    }

    const bookings = await Booking.find(query)
      .populate('item', 'title images dailyPrice category')
      .populate('borrower', 'name email phone profilePicture')
      .populate('lender', 'name email phone profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBookings = await Booking.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalBookings / limit),
          totalBookings
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

// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('item', 'title images dailyPrice category location')
      .populate('borrower', 'name email phone profilePicture rating')
      .populate('lender', 'name email phone profilePicture rating');

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
        message: 'Not authorized to view this booking'
      });
    }

    res.json({
      status: 'success',
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/approve
// @desc    Approve booking request (lender only)
// @access  Private
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('item')
      .populate('borrower');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is the lender
    if (booking.lender.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the lender can approve this booking'
      });
    }

    // Check if booking is in pending status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking is not in pending status'
      });
    }

    // Process upfront payment
    const paymentResult = await processPayment(
      booking.borrower._id,
      booking.upfrontFee,
      'booking-fee',
      `Upfront fee for booking ${booking._id}`,
      booking._id
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        status: 'error',
        message: paymentResult.error
      });
    }

    // Update booking status
    booking.status = 'approved';
    booking.approvalDate = new Date();
    booking.paymentStatus = 'upfront-paid';
    booking.transactions.push({
      type: 'upfront',
      amount: booking.upfrontFee,
      description: 'Upfront booking fee paid',
      timestamp: new Date()
    });

    await booking.save();

    // Mark item as unavailable
    await Item.findByIdAndUpdate(booking.item._id, { isAvailable: false });

    // Update user stats
    await User.findByIdAndUpdate(booking.borrower._id, {
      $inc: { itemsBorrowed: 1 }
    });

    res.json({
      status: 'success',
      message: 'Booking approved successfully',
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/reject
// @desc    Reject booking request (lender only)
// @access  Private
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is the lender
    if (booking.lender.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the lender can reject this booking'
      });
    }

    // Check if booking is in pending status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking is not in pending status'
      });
    }

    booking.status = 'rejected';
    await booking.save();

    res.json({
      status: 'success',
      message: 'Booking rejected successfully',
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/start
// @desc    Start the rental period (lender confirms handover)
// @access  Private
router.put('/:id/start', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is the lender
    if (booking.lender.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the lender can start the rental'
      });
    }

    // Check if booking is approved
    if (booking.status !== 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking must be approved first'
      });
    }

    booking.status = 'active';
    await booking.save();

    res.json({
      status: 'success',
      message: 'Rental period started successfully',
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/return
// @desc    Mark item as returned (borrower)
// @access  Private
router.put('/:id/return', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('item')
      .populate('lender');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is the borrower
    if (booking.borrower.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the borrower can mark item as returned'
      });
    }

    // Check if booking is active
    if (booking.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking is not in active status'
      });
    }

    booking.status = 'returned';
    booking.actualReturnDate = new Date();
    await booking.save();

    res.json({
      status: 'success',
      message: 'Item marked as returned. Waiting for lender confirmation.',
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/confirm-return
// @desc    Confirm item return and process final payment (lender)
// @access  Private
router.put('/:id/confirm-return', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('item')
      .populate('borrower')
      .populate('lender');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is the lender
    if (booking.lender._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the lender can confirm return'
      });
    }

    // Check if booking is in returned status
    if (booking.status !== 'returned') {
      return res.status(400).json({
        status: 'error',
        message: 'Item must be marked as returned first'
      });
    }

    // Calculate remaining payment
    const remainingAmount = booking.totalAmount - booking.upfrontFee;
    const lenderAmount = booking.subtotal; // Lender gets subtotal (without commission)

    // Process final payment from borrower
    if (remainingAmount > 0) {
      const paymentResult = await processPayment(
        booking.borrower._id,
        remainingAmount,
        'rental-payment',
        `Final payment for booking ${booking._id}`,
        booking._id
      );

      if (!paymentResult.success) {
        return res.status(400).json({
          status: 'error',
          message: paymentResult.error
        });
      }

      booking.transactions.push({
        type: 'settlement',
        amount: remainingAmount,
        description: 'Final rental payment',
        timestamp: new Date()
      });
    }

    // Credit lender's wallet
    await creditWallet(
      booking.lender._id,
      lenderAmount,
      'rental-income',
      `Rental income for booking ${booking._id}`,
      booking._id
    );

    // Update booking status
    booking.status = 'completed';
    booking.returnConfirmed = true;
    booking.returnDate = new Date();
    booking.paymentStatus = 'completed';

    await booking.save();

    // Mark item as available again
    await Item.findByIdAndUpdate(booking.item._id, { 
      isAvailable: true,
      $inc: { totalBookings: 1 }
    });

    res.json({
      status: 'success',
      message: 'Return confirmed and payment processed successfully',
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is involved in this booking
    if (booking.borrower.toString() !== req.user.id && 
        booking.lender.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (!['pending', 'approved'].includes(booking.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking cannot be cancelled in current status'
      });
    }

    // Refund upfront fee if payment was made
    if (booking.paymentStatus === 'upfront-paid') {
      await creditWallet(
        booking.borrower,
        booking.upfrontFee,
        'refund',
        `Refund for cancelled booking ${booking._id}`,
        booking._id
      );

      booking.transactions.push({
        type: 'refund',
        amount: booking.upfrontFee,
        description: 'Booking cancellation refund',
        timestamp: new Date()
      });

      booking.paymentStatus = 'refunded';
    }

    booking.status = 'cancelled';
    await booking.save();

    // Make item available again if it was marked unavailable
    if (booking.status === 'approved') {
      await Item.findByIdAndUpdate(booking.item, { isAvailable: true });
    }

    res.json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;