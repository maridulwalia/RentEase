const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = './uploads';
const profileDir = './uploads/profiles';
const itemDir = './uploads/items';
const complaintDir = './uploads/complaints';

[uploadDir, profileDir, itemDir, complaintDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = profileDir; // default
    
    if (req.route.path.includes('item')) {
      uploadPath = itemDir;
    } else if (req.route.path.includes('complaint')) {
      uploadPath = complaintDir;
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed.'));
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload middleware for different purposes
const uploadProfilePicture = upload.single('profilePicture');
const uploadIdProof = upload.single('idProof');
const uploadItemImages = upload.array('images', 5);
const uploadComplaintEvidence = upload.array('evidence', 3);

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File size too large. Maximum 5MB allowed.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files. Maximum allowed exceeded.'
      });
    }
  }
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  next(err);
};

module.exports = {
  uploadProfilePicture,
  uploadIdProof,
  uploadItemImages,
  uploadComplaintEvidence,
  handleUploadError
};