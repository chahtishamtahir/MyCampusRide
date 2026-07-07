const User = require('../models/User');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'assignedBus',
      populate: [
        { path: 'driverId', select: 'name email phone' },
        { path: 'routeId', select: 'routeName routeNo stops departureTime estimatedDuration distance' }
      ]
    })
    .populate('assignedRoute', 'routeName routeNo stops departureTime estimatedDuration distance');

  res.json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  const userId = req.user._id;

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name must be a non-empty string'
      });
    }
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 50 characters'
      });
    }
  }

  // Validate email if provided
  if (email !== undefined) {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use by another account'
      });
    }
  }

  // Validate phone if provided
  if (phone !== undefined) {
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be in format 03XXXXXXXXX (e.g., 03001234567)'
      });
    }
  }

  const updateData = {};

  if (name !== undefined) {
    updateData.name = name.trim();
  }

  if (email !== undefined) {
    updateData.email = email;
  }

  if (phone !== undefined) {
    updateData.phone = phone;
  }

  if (req.file) {
    updateData.profilePicture = 'uploads/profiles/' + req.file.filename;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again.'
    });
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Get user with password
  const user = await User.findById(userId).select('+password');
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Validate new password
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters long'
    });
  }
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: 'New password must contain at least one uppercase letter'
    });
  }
  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: 'New password must contain at least one number'
    });
  }

  // Check current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// @desc    Select route for student
// @route   PUT /api/auth/select-route
// @access  Private (Student only)
const selectRoute = asyncHandler(async (req, res) => {
  const { routeId, stopName } = req.body;
  const userId = req.user._id;

  // Ensure user is a student
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can select a route'
    });
  }

  if (!routeId) {
    return res.status(400).json({
      success: false,
      message: 'Route ID is required'
    });
  }

  // Validate that the route exists and is active
  const route = await Route.findById(routeId);
  if (!route) {
    return res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }

  if (!route.isActive) {
    return res.status(400).json({
      success: false,
      message: 'This route is not currently active'
    });
  }

  // Validate stop if provided
  if (stopName && route.stops && route.stops.length > 0) {
    const validStop = route.stops.find(s => s.name === stopName);
    if (!validStop) {
      return res.status(400).json({
        success: false,
        message: 'Selected stop is not valid for this route'
      });
    }
  }

  // If user was previously assigned to a bus, free up the seat
  if (req.user.assignedBus) {
    await Bus.findByIdAndUpdate(req.user.assignedBus, { $inc: { capacity: 1 } });
  }

  // Update the student's assignedRoute, stopName, and clear bus
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { assignedRoute: routeId, assignedBus: null, stopName: stopName || null },
    { new: true, runValidators: true }
  ).populate('assignedRoute', 'routeName routeNo description departureTime distance estimatedDuration stops');

  res.json({
    success: true,
    message: `Route "${route.routeName}" selected successfully${stopName ? ` with stop "${stopName}"` : ''}`,
    data: updatedUser
  });
});

// @desc    Upload fee receipt (student self-service)
// @route   PUT /api/auth/upload-fee-receipt
// @access  Private (Student only)
const uploadFeeReceipt = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Ensure user is a student
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can upload fee receipts'
    });
  }

  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a fee receipt file (PDF or image)'
    });
  }

  const feeReceiptPath = 'uploads/fee-receipts/' + req.file.filename;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      feeReceipt: feeReceiptPath,
      feeReceiptStatus: 'pending_review',
      feeReceiptSubmittedAt: new Date()
    },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    return res.status(500).json({
      success: false,
      message: 'Failed to upload fee receipt. Please try again.'
    });
  }

  res.json({
    success: true,
    message: 'Fee receipt uploaded successfully. It is now pending admin review.',
    data: updatedUser
  });
});

module.exports = {
  getMe,
  updateProfile,
  changePassword,
  selectRoute,
  uploadFeeReceipt
};
