const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  approveDriver,
  rejectDriver,
  getPendingDrivers,
  getUserStats,
  getDriverLicense,
  markFeeDefaulters,
  reviewFeeReceipt,
  getFeeReceipt
} = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { adminOnly, adminOrDriver } = require('../middleware/roleMiddleware');
const upload = require('../middleware/fileUpload');

// All routes require authentication
router.use(authMiddleware);

// Admin or Driver routes (drivers can view users assigned to their bus)
router.get('/', adminOrDriver, getUsers);
router.post('/', adminOnly, upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 }
]), createUser);
router.get('/stats', adminOnly, getUserStats);
router.get('/pending-drivers', adminOnly, getPendingDrivers);
router.get('/:id', adminOnly, getUser);
router.put('/:id', adminOnly, updateUser);
router.delete('/:id', adminOnly, deleteUser);
router.put('/:id/approve', adminOnly, approveDriver);
router.put('/:id/reject', adminOnly, rejectDriver);
router.get('/:id/license', adminOnly, getDriverLicense);
router.put('/:id/review-fee-receipt', adminOnly, reviewFeeReceipt);
router.get('/:id/fee-receipt', adminOnly, getFeeReceipt);
router.put('/action/mark-defaulters', adminOnly, markFeeDefaulters);

module.exports = router;




