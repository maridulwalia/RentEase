const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Creates upload directories if they don't exist
 * @description Ensures all required upload directories are created
 * Special features:
 * - Creates directory structure for different file types
 * - Uses recursive option to create nested directories
 * - Handles different upload categories (profiles, items, documents, evidence)
 */
// Ensure upload directories exist
const uploadDirs = ['uploads/profiles', 'uploads/items', 'uploads/documents', 'uploads/evidence'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Multer disk storage configuration for file uploads
 * @description Configures file storage with dynamic path routing and unique naming
 * Special features:
 * - Routes files to different directories based on fieldname
 * - Creates unique filenames using timestamp and random number
 * - Preserves original file extensions
 * - Organizes uploads by type (profiles, items, documents, evidence)
 * - Handles miscellaneous files in fallback directory
 */
// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'profileImage') {
      uploadPath += 'profiles/';
    } else if (file.fieldname === 'images') {
      uploadPath += 'items/';
    } else if (file.fieldname === 'idProof') {
      uploadPath += 'documents/';
    } else if (file.fieldname === 'evidence') {
      uploadPath += 'evidence/';
    } else {
      uploadPath += 'misc/';
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * File type validation filter for different upload categories
 * @function fileFilter
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 * @description Validates file types based on upload fieldname
 * Special features:
 * - Different allowed file types for different upload purposes
 * - Profile images: images only (jpeg, jpg, png, gif)
 * - Item images: images only (jpeg, jpg, png, gif)
 * - ID proofs: images and PDFs (jpeg, jpg, png, pdf)
 * - Evidence: documents and images (jpeg, jpg, png, pdf, doc, docx)
 * - Validates both file extension and MIME type for security
 * - Provides descriptive error messages for rejected files
 */
// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'profileImage': /jpeg|jpg|png|gif/,
    'images': /jpeg|jpg|png|gif/,
    'idProof': /jpeg|jpg|png|pdf/,
    'evidence': /jpeg|jpg|png|pdf|doc|docx/
  };
  
  const fileType = allowedTypes[file.fieldname] || /jpeg|jpg|png|pdf/;
  const extname = fileType.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileType.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${fileType}`));
  }
};

/**
 * Main multer configuration with storage, limits, and file filtering
 * @description Configures multer with file size limits and type validation
 * Special features:
 * - 5MB file size limit for all uploads
 * - Uses custom storage configuration for organized file management
 * - Applies file type filtering for security
 */
// Upload configurations
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

/**
 * Specialized upload configurations for different use cases
 * @description Pre-configured multer instances for specific upload scenarios
 * Special features:
 * - uploadProfile: Single profile image upload
 * - uploadIdProof: Single ID proof document upload
 * - uploadItemImages: Multiple item images (max 5)
 * - uploadEvidence: Multiple evidence files (max 3)
 */
// Specific upload configurations
const uploadProfile = upload.single('profileImage');
const uploadIdProof = upload.single('idProof');
const uploadItemImages = upload.array('images', 5); // Max 5 images
const uploadEvidence = upload.array('evidence', 3); // Max 3 evidence files

/**
 * Upload error handling middleware
 * @function handleUploadError
 * @param {Error} error - Error object from multer or file processing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @description Handles multer-specific errors and file validation errors
 * Special features:
 * - Handles file size limit errors (LIMIT_FILE_SIZE)
 * - Handles file count limit errors (LIMIT_FILE_COUNT)
 * - Handles invalid file type errors from fileFilter
 * - Provides user-friendly error messages
 * - Passes other errors to global error handler
 */
// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  upload,
  uploadProfile,
  uploadIdProof,
  uploadItemImages,
  uploadEvidence,
  handleUploadError
};