/*
 * Authentication Controller
 *
 * This file handles all authentication-related operations:
 * - User registration (with role-specific validation)
 * - User login (with password verification)
 * - Admin secret code validation (for admin registration security)
 * - User logout
 *
 * SECURITY NOTE: Passwords are hashed before storage using bcrypt (in User model)
 */

const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const sendEmail = require('../utils/email');
const { sendTokenResponse, clearTokenCookie } = require('../utils/jwtHelper');
const { getVerificationEmailHtml } = require('../utils/emailTemplates');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const files = req.files || {};

  // 1. Password validation (Fail fast before database queries)
  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain at least one uppercase letter'
    });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain at least one number'
    });
  }

  // 2. Validate email is unique
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // 3. Prepare common user data
  const userData = {
    name,
    email,
    password,
    role,
    phone
  };

  if (files.profilePicture && files.profilePicture.length > 0) {
    userData.profilePicture = 'uploads/profiles/' + files.profilePicture[0].filename;
  }

  // 4. Role-specific validation and data assignment
  if (role === 'admin') {
    const { adminSecretCode } = req.body;
    if (!adminSecretCode) {
      return res.status(400).json({
        success: false,
        message: 'Admin secret code is required to register as admin'
      });
    }

    if (adminSecretCode !== process.env.ADMIN_SECRET_CODE) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin secret code. Please contact the system administrator.'
      });
    }
  } else if (role === 'student') {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required for student registration'
      });
    }

    const existingStudent = await User.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student ID already exists'
      });
    }

    userData.studentId = studentId;
    userData.feeStatus = 'pending';
  } else if (role === 'driver') {
    const { licenseNumber, salary } = req.body;
    if (!licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'License number is required for driver registration'
      });
    }

    if (!salary) {
      return res.status(400).json({
        success: false,
        message: 'Salary is required for driver registration'
      });
    }

    if (!files.drivingLicense || files.drivingLicense.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Driving license PDF is required for driver registration'
      });
    }

    const existingDriver = await User.findOne({ licenseNumber });
    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'License number already exists'
      });
    }

    userData.licenseNumber = licenseNumber;
    userData.drivingLicenseFile = 'uploads/licenses/' + files.drivingLicense[0].filename;
    userData.salary = Number(salary);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Must be admin, student, or driver.'
    });
  }

  // 5. Create user and generate verification token
  const user = new User(userData);
  const verifyToken = user.createEmailVerificationToken();
  await user.save();

  // Send verification email
  const verifyURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verifyToken}`;
  const message = `Please verify your email address by clicking the following link:\n\n${verifyURL}\n\nIf you did not request this, please ignore this email.`;

  const html = getVerificationEmailHtml(verifyURL, user.name);

  try {
    await sendEmail({
      email: user.email,
      subject: 'MyCampusRide - Verify your email address',
      message,
      html
    });
  } catch (err) {
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error('Email send error:', err);
    return res.status(500).json({
      success: false,
      message: 'There was an error sending the verification email. Please try again later.'
    });
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful! Please check your email to verify your account.',
    data: {
      user: user.toJSON()
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check if user is verified
  if (!user.isVerified) {
    return res.status(401).json({
      success: false,
      message: 'Please verify your email address to log in'
    });
  }

  // Check if user is suspended
  if (user.status === 'suspended') {
    return res.status(401).json({
      success: false,
      message: 'Account is suspended. Please contact administrator.'
    });
  }

  // Send token response
  return sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = {
  register,
  login,
  logout
};
