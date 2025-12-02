const express = require('express');
const { body } = require('express-validator');
const { adminAuth } = require('../middleware/auth');
const {
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
} = require('../controllers/adminController');

const router = express.Router();

// Public maintenance status endpoint (no auth required)
router.get('/maintenance-status', getMaintenanceStatus);

// All other routes require admin authentication
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id/suspend', toggleUserSuspension);
router.put('/users/:id/verify', toggleUserVerification);

// Complaint management
router.get('/complaints', getAllComplaints);
router.put('/complaints/:id', updateComplaint);

// Review management
router.get('/reviews/reported', getReportedReviews);
router.get('/reviews', getAllReviews);
router.put('/reviews/:id/toggle-visibility', toggleReviewVisibility);

// Settings management
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

module.exports = router;