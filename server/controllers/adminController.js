const User = require('../models/User');
const Item = require('../models/Item');
const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const Review = require('../models/Review');
const Settings = require('../models/Settings');
const { clearMaintenanceCache } = require('../middleware/maintenance');

// Get admin dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalItems,
      totalBookings,
      totalComplaints,
      activeBookings,
      completedBookings,
      openComplaints,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Item.countDocuments(),
      Booking.countDocuments(),
      Complaint.countDocuments(),
      Booking.countDocuments({ status: 'active' }),
      Booking.countDocuments({ status: 'completed' }),
      Complaint.countDocuments({ status: 'open' }),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.platformFee' } } }
      ])
    ]);

    // Recent activities
    const recentBookings = await Booking.find()
      .populate('item', 'title')
      .populate('borrower', 'name')
      .populate('lender', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentComplaints = await Complaint.find()
      .populate('complainant', 'name')
      .populate('defendant', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalItems,
          totalBookings,
          totalComplaints,
          activeBookings,
          completedBookings,
          openComplaints,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        recentActivities: {
          bookings: recentBookings,
          complaints: recentComplaints
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard stats'
    });
  }
};

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, verification } = req.query;

    let query = { role: 'user' };

    // Search filter
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    // Status filter
    if (status === 'suspended') {
      query.isSuspended = true;
    } else if (status === 'active') {
      query.isSuspended = false;
    }

    // Verification filter
    if (verification === 'verified') {
      query.isVerified = true;
    } else if (verification === 'unverified') {
      query.isVerified = false;
    }

    const users = await User.find(query)
      .select('-password')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

// Get user details with stats
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's items, bookings, and complaints
    const [items, bookings, complaints, reviews] = await Promise.all([
      Item.find({ owner: user._id }).sort({ createdAt: -1 }).limit(5),
      Booking.find({
        $or: [{ borrower: user._id }, { lender: user._id }]
      }).populate('item', 'title').sort({ createdAt: -1 }).limit(5),
      Complaint.find({
        $or: [{ complainant: user._id }, { defendant: user._id }]
      }).sort({ createdAt: -1 }).limit(5),
      Review.find({ reviewer: user._id }).populate('item', 'title').sort({ createdAt: -1 }).limit(5)
    ]);

    res.json({
      success: true,
      data: {
        user,
        activities: {
          items,
          bookings,
          complaints,
          reviews
        }
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user details'
    });
  }
};

// Suspend/Unsuspend user
const toggleUserSuspension = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend admin users'
      });
    }

    user.isSuspended = !user.isSuspended;
    await user.save();

    // Cancel active bookings if suspending
    if (user.isSuspended) {
      await Booking.updateMany(
        {
          $or: [{ borrower: user._id }, { lender: user._id }],
          status: { $in: ['pending', 'approved'] }
        },
        { 
          status: 'cancelled',
          $push: {
            timeline: {
              status: 'cancelled',
              note: `Cancelled due to user suspension: ${reason}`,
              timestamp: new Date()
            }
          }
        }
      );
    }

    res.json({
      success: true,
      message: `User ${user.isSuspended ? 'suspended' : 'unsuspended'} successfully`,
      data: { user }
    });

  } catch (error) {
    console.error('Toggle user suspension error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user status'
    });
  }
};

// Verify/Unverify user account
const toggleUserVerification = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify admin user verification'
      });
    }

    user.isVerified = !user.isVerified;
    
    // Store verification details
    if (user.isVerified) {
      user.verificationReason = reason || 'Verified by admin';
      user.verificationDate = new Date();
      user.verifiedBy = req.user.id;
    } else {
      // Clear verification details when unverifying
      user.verificationReason = null;
      user.verificationDate = null;
      user.verifiedBy = null;
    }
    
    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('verifiedBy', 'name')
      .select('-password');

    res.json({
      success: true,
      message: `User account ${user.isVerified ? 'verified' : 'unverified'} successfully`,
      data: { user: populatedUser }
    });

  } catch (error) {
    console.error('Toggle user verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user verification status'
    });
  }
};

// Get all complaints for admin
const getAllComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;

    let query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    const complaints = await Complaint.find(query)
      .populate('complainant', 'name email')
      .populate('defendant', 'name email')
      .populate('booking', 'item')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(query);

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching complaints'
    });
  }
};

// Update complaint status and resolution
const updateComplaint = async (req, res) => {
  try {
    const { status, priority, resolution, adminNote } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Update basic fields
    if (status) complaint.status = status;
    if (priority) complaint.priority = priority;

    // Add admin note
    if (adminNote) {
      complaint.adminNotes.push({
        admin: req.user.id,
        note: adminNote,
        timestamp: new Date()
      });
    }

    // Handle resolution
    if (resolution && status === 'resolved') {
      complaint.resolution = {
        action: resolution.action,
        description: resolution.description,
        resolvedBy: req.user.id,
        resolvedAt: new Date()
      };

      // Execute resolution actions
      if (resolution.action === 'suspension') {
        await User.findByIdAndUpdate(complaint.defendant, {
          isSuspended: true
        });
      } else if (resolution.action === 'refund' && resolution.amount) {
        await User.findByIdAndUpdate(complaint.complainant, {
          $inc: { 'wallet.balance': resolution.amount },
          $push: {
            'wallet.transactions': {
              type: 'credit',
              amount: resolution.amount,
              description: `Refund for complaint #${complaint._id}`,
              date: new Date()
            }
          }
        });
      }
    }

    await complaint.save();

    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate('complainant', 'name email')
      .populate('defendant', 'name email')
      .populate('resolution.resolvedBy', 'name');

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      data: { complaint: updatedComplaint }
    });

  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating complaint'
    });
  }
};

// Get reported reviews
const getReportedReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const reviews = await Review.find({ isReported: true, isHidden: false })
      .populate('reviewer', 'name email')
      .populate('reviewee', 'name email')
      .populate('item', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ isReported: true, isHidden: false });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get reported reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reported reviews'
    });
  }
};

// Get all reviews for admin
const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, filter = 'all' } = req.query;

    let query = {};
    
    // Filter by status
    if (filter === 'reported') {
      query.isReported = true;
    } else if (filter === 'hidden') {
      query.isHidden = true;
    } else if (filter === 'visible') {
      query.isHidden = false;
    }
    // 'all' shows everything

    const reviews = await Review.find(query)
      .populate('reviewer', 'name email profileImage')
      .populate('reviewee', 'name email')
      .populate('item', 'title')
      .populate('booking', 'startDate endDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reviews'
    });
  }
};

// Hide/Unhide review
const toggleReviewVisibility = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.isHidden = !review.isHidden;
    await review.save();

    res.json({
      success: true,
      message: `Review ${review.isHidden ? 'hidden' : 'unhidden'} successfully`,
      data: { review }
    });

  } catch (error) {
    console.error('Toggle review visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating review visibility'
    });
  }
};

// Get admin settings
const getAdminSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching admin settings'
    });
  }
};

// Get maintenance status (public endpoint)
const getMaintenanceStatus = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    const isMaintenanceEnabled = settings.maintenanceMode === true || 
      (settings.maintenanceMode && settings.maintenanceMode.enabled === true);
    
    const maintenanceMessage = settings.maintenanceMode && 
      typeof settings.maintenanceMode === 'object' && 
      settings.maintenanceMode.message 
        ? settings.maintenanceMode.message 
        : 'System is currently under maintenance. Please try again later.';

    res.json({
      success: true,
      data: {
        maintenanceMode: isMaintenanceEnabled,
        message: maintenanceMessage,
        estimatedDowntime: 'We apologize for the inconvenience. The system will be back online shortly.'
      }
    });
  } catch (error) {
    console.error('Get maintenance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching maintenance status'
    });
  }
};

// Update admin settings
const updateAdminSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Handle maintenance mode specially
    if (req.body.hasOwnProperty('maintenanceMode')) {
      const maintenanceMode = req.body.maintenanceMode;
      
      // If it's a boolean (legacy support), convert to new format
      if (typeof maintenanceMode === 'boolean') {
        settings.maintenanceMode = {
          enabled: maintenanceMode,
          message: maintenanceMode ? 'System is currently under maintenance. Please try again later.' : (settings.maintenanceMode?.message || 'System is currently under maintenance. Please try again later.'),
          enabledAt: maintenanceMode ? new Date() : (settings.maintenanceMode?.enabledAt || null),
          enabledBy: maintenanceMode ? req.user.id : (settings.maintenanceMode?.enabledBy || null)
        };
      } else if (typeof maintenanceMode === 'object') {
        // Handle new object format
        settings.maintenanceMode = {
          enabled: maintenanceMode.enabled !== undefined ? maintenanceMode.enabled : (settings.maintenanceMode?.enabled || false),
          message: maintenanceMode.message || (settings.maintenanceMode?.message || 'System is currently under maintenance. Please try again later.'),
          enabledAt: maintenanceMode.enabled ? (maintenanceMode.enabledAt ? new Date(maintenanceMode.enabledAt) : new Date()) : (settings.maintenanceMode?.enabledAt || null),
          enabledBy: maintenanceMode.enabled ? (maintenanceMode.enabledBy || req.user.id) : (settings.maintenanceMode?.enabledBy || null)
        };
      }
      
      // Remove maintenanceMode from req.body to prevent double processing
      delete req.body.maintenanceMode;
    }
    
    // Update other settings with provided data
    Object.keys(req.body).forEach(key => {
      if (settings.schema.paths[key] && key !== 'maintenanceMode') {
        // Handle nested objects properly - but don't merge for settings that should be replaced
        if (typeof req.body[key] === 'object' && req.body[key] !== null && !Array.isArray(req.body[key])) {
          // For nested objects, merge only if the schema expects an object
          const schemaPath = settings.schema.paths[key];
          if (schemaPath && schemaPath.schema) {
            // It's a nested schema, merge
            settings[key] = { ...settings[key], ...req.body[key] };
          } else {
            // It's a regular object, replace
            settings[key] = req.body[key];
          }
        } else {
          settings[key] = req.body[key];
        }
      }
    });
    
    await settings.save();

    try {
      clearMaintenanceCache();
    } catch (err) {
      console.error('Failed to clear maintenance cache:', err);
    }
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    console.error('Update admin settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating admin settings'
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  toggleUserSuspension,
  toggleUserVerification,
  getAllComplaints,
  updateComplaint,
  getReportedReviews,
  getAllReviews,
  toggleReviewVisibility,
  getAdminSettings,
  updateAdminSettings,
  getMaintenanceStatus
};