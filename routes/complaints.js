const express = require('express');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Item = require('../models/Item');
const { auth } = require('../middleware/auth');
const { validateComplaint } = require('../middleware/validation');
const { uploadComplaintEvidence, handleUploadError } = require('../middleware/upload');
const router = express.Router();

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private
router.post('/', auth, uploadComplaintEvidence, handleUploadError, validateComplaint, async (req, res) => {
  try {
    const { defendantId, bookingId, itemId, category, subject, description } = req.body;

    // Check if defendant exists
    const defendant = await User.findById(defendantId);
    if (!defendant) {
      return res.status(404).json({
        status: 'error',
        message: 'Defendant user not found'
      });
    }

    // Validate booking if provided
    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          status: 'error',
          message: 'Booking not found'
        });
      }

      // Check if user is involved in the booking
      if (booking.borrower.toString() !== req.user.id && 
          booking.lender.toString() !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only file complaints for bookings you are involved in'
        });
      }
    }

    // Validate item if provided
    let item = null;
    if (itemId) {
      item = await Item.findById(itemId);
      if (!item) {
        return res.status(404).json({
          status: 'error',
          message: 'Item not found'
        });
      }
    }

    // Create complaint data
    const complaintData = {
      complainant: req.user.id,
      defendant: defendantId,
      category,
      subject,
      description
    };

    if (bookingId) complaintData.booking = bookingId;
    if (itemId) complaintData.item = itemId;

    // Add evidence files if uploaded
    if (req.files && req.files.length > 0) {
      complaintData.evidence = req.files.map(file => ({
        filename: file.filename,
        path: file.path,
        uploadedAt: new Date()
      }));
    }

    const complaint = new Complaint(complaintData);
    await complaint.save();

    await complaint.populate([
      { path: 'complainant', select: 'name email' },
      { path: 'defendant', select: 'name email' },
      { path: 'booking', select: 'startDate endDate' },
      { path: 'item', select: 'title' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Complaint filed successfully',
      data: { complaint }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   GET /api/complaints
// @desc    Get user's complaints (filed by user)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const complaints = await Complaint.find({ complainant: req.user.id })
      .populate('defendant', 'name email')
      .populate('booking', 'startDate endDate')
      .populate('item', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalComplaints = await Complaint.countDocuments({ complainant: req.user.id });

    res.json({
      status: 'success',
      data: {
        complaints,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalComplaints / limit),
          totalComplaints
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

// @route   GET /api/complaints/:id
// @desc    Get single complaint
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('complainant', 'name email')
      .populate('defendant', 'name email')
      .populate('booking', 'startDate endDate')
      .populate('item', 'title');

    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    // Check if user is involved in the complaint
    if (complaint.complainant._id.toString() !== req.user.id && 
        complaint.defendant._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this complaint'
      });
    }

    res.json({
      status: 'success',
      data: { complaint }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   PUT /api/complaints/:id
// @desc    Update complaint (only complainant can update)
// @access  Private
router.put('/:id', auth, uploadComplaintEvidence, handleUploadError, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    // Check if user is the complainant
    if (complaint.complainant.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the complainant can update this complaint'
      });
    }

    // Check if complaint is still open
    if (complaint.status !== 'open') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update complaint that is not in open status'
      });
    }

    const { subject, description } = req.body;
    const updates = {};

    if (subject) updates.subject = subject;
    if (description) updates.description = description;

    // Add new evidence files if uploaded
    if (req.files && req.files.length > 0) {
      const newEvidence = req.files.map(file => ({
        filename: file.filename,
        path: file.path,
        uploadedAt: new Date()
      }));
      updates.evidence = [...(complaint.evidence || []), ...newEvidence];
    }

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate([
      { path: 'complainant', select: 'name email' },
      { path: 'defendant', select: 'name email' },
      { path: 'booking', select: 'startDate endDate' },
      { path: 'item', select: 'title' }
    ]);

    res.json({
      status: 'success',
      message: 'Complaint updated successfully',
      data: { complaint: updatedComplaint }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @route   DELETE /api/complaints/:id
// @desc    Delete complaint (only complainant can delete if status is open)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    // Check if user is the complainant
    if (complaint.complainant.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the complainant can delete this complaint'
      });
    }

    // Check if complaint is still open
    if (complaint.status !== 'open') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete complaint that is not in open status'
      });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;