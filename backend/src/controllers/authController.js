const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// Login
exports.login = async (req, res, next) => {
  try {
    console.log('hhhh')
    const { username, password } = req.body;
    console.log(username,password)
    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user
    const user = await User.findByUsername(username);
    console.log("user" , user)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    console.log(password, isPasswordValid)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await User.updateLastLogin(user.user_id);

    // Generate tokens
    const token = generateToken(user.user_id, user.role);
    const refreshToken = generateRefreshToken(user.user_id);

    // Get user's assigned reactors
    const assignedReactors = await User.getAssignedReactors(user.user_id);

    logger.info(`User logged in: ${username}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        refreshToken,
        user: {
          userId: user.user_id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          assignedReactors
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user.user_id, user.role);
    const newRefreshToken = generateRefreshToken(user.user_id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    logger.error('Refresh token error:', error);
    next(error);
  }
};

// Logout (client-side token removal, but we log it)
exports.logout = async (req, res, next) => {
  try {
    logger.info(`User logged out: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get assigned reactors
    const assignedReactors = await User.getAssignedReactors(user.user_id);

    res.json({
      success: true,
      data: {
        userId: user.user_id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        assignedReactors
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
};

// Update profile (normal user)
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, email } = req.body;
    const updates = {};

    if (fullName) updates.full_name = fullName;
    if (email) {
      // Check if email already exists
      const emailExists = await User.emailExists(email, req.user.userId);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const updatedUser = await User.update(req.user.userId, updates);

    logger.info(`User profile updated: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

// Change username
exports.changeUsername = async (req, res, next) => {
  try {
    const { newUsername } = req.body;

    if (!newUsername) {
      return res.status(400).json({
        success: false,
        message: 'New username is required'
      });
    }

    // Check if username already exists
    const usernameExists = await User.usernameExists(newUsername, req.user.userId);
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    const updatedUser = await User.updateUsername(req.user.userId, newUsername);

    logger.info(`Username changed: ${req.user.username} -> ${newUsername}`);

    res.json({
      success: true,
      message: 'Username changed successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Change username error:', error);
    next(error);
  }
};

// Change password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password hash
    const user = await User.findByUsername(req.user.username);

    // Verify current password
    const isPasswordValid = await User.verifyPassword(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await User.updatePassword(req.user.userId, newPassword);

    logger.info(`Password changed: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
};

module.exports = exports;