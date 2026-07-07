const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout
} = require('../controllers/authController');
const {
  verifyEmail,
  resendVerificationEmail
} = require('../controllers/emailVerificationController');
const {
  getMe,
  updateProfile,
  changePassword,
  selectRoute,
  uploadFeeReceipt
} = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/fileUpload');

// Public routes
// multer middleware handles optional file upload for driver registration and mandatory profile picture
router.post('/register', upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 }
]), register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, upload.single('profilePicture'), updateProfile);
router.put('/change-password', authMiddleware, changePassword);
router.put('/select-route', authMiddleware, selectRoute);
router.put('/upload-fee-receipt', authMiddleware, upload.single('feeReceipt'), uploadFeeReceipt);

module.exports = router;