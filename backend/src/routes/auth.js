const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   POST /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', authController.refreshToken);

// @route   POST /api/v1/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateToken, authController.logout);

// @route   GET /api/v1/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, authController.getProfile);

// @route   PUT /api/v1/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, authController.updateProfile);

// @route   PUT /api/v1/auth/username
// @desc    Change username
// @access  Private
router.put('/username', authenticateToken, authController.changeUsername);

// @route   PUT /api/v1/auth/password
// @desc    Change password
// @access  Private
router.put('/password', authenticateToken, authController.changePassword);

module.exports = router;