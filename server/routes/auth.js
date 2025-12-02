const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { uploadIdProof, uploadProfile, handleUploadError } = require('../middleware/upload');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,addToWallet
} = require('../controllers/authController');

const router = express.Router();

/**
 * Validation rules for user registration
 * @description Express-validator rules for registration endpoint
 * Special features:
 * - Name: 2-50 characters, trimmed
 * - Email: Valid email format with normalization
 * - Password: Minimum 6 characters
 * - Phone: Exactly 10 digits
 */
// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
];

/**
 * Validation rules for user login
 * @description Express-validator rules for login endpoint
 * Special features:
 * - Email: Valid email format with normalization
 * - Password: Non-empty validation
 */
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Authentication routes configuration
 * @description Defines all authentication-related endpoints
 * Special features:
 * - POST /register: User registration with ID proof upload and validation
 * - POST /login: User login with email/password validation
 * - GET /profile: Get current user profile (protected)
 * - PUT /profile: Update user profile with optional image upload (protected)
 * - PUT /change-password: Change user password (protected)
 */
// Routes
router.post('/register', uploadIdProof, handleUploadError, registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, uploadProfile, handleUploadError, updateProfile);
router.put('/change-password', auth, changePassword);
router.post('/add-to-wallet', auth, addToWallet);

module.exports = router;