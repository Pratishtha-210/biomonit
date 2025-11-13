const User = require('../models/User');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Generate random password
const generatePassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive } = req.query;

    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const users = await User.findAll(filters);

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    next(error);
  }
};

// Get user by ID
exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get assigned reactors
    const assignedReactors = await User.getAssignedReactors(userId);

    res.json({
      success: true,
      data: {
        ...user,
        assignedReactors
      }
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    next(error);
  }
};

// Create new user (Admin only)
exports.createUser = async (req, res, next) => {
  try {
    const { username, fullName, email, role, password } = req.body;

    // Validate required fields
    if (!username || !fullName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, full name, email, and role are required'
      });
    }

    // Check if username exists
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate password if not provided
    const userPassword = password || generatePassword();

    const userData = {
      username,
      fullName,
      email,
      password: userPassword,
      role
    };

    const newUser = await User.create(userData);

    logger.info(`User created by admin: ${username}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: newUser,
        generatedPassword: password ? null : userPassword
      }
    });
  } catch (error) {
    logger.error('Create user error:', error);
    next(error);
  }
};

// Update user (Admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { fullName, email, role, isActive } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (email !== undefined) {
      // Check if email already exists
      const emailExists = await User.emailExists(email, userId);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      updates.email = email;
    }
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const updatedUser = await User.update(userId, updates);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User updated by admin: ${userId}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Update user error:', error);
    next(error);
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.delete(userId);

    logger.info(`User deleted by admin: ${userId}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

// Assign user to reactor
exports.assignUserToReactor = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reactorId, accessLevel } = req.body;

    if (!reactorId || !accessLevel) {
      return res.status(400).json({
        success: false,
        message: 'Reactor ID and access level are required'
      });
    }

    const assignment = await User.assignToReactor(userId, reactorId, accessLevel);

    logger.info(`User ${userId} assigned to reactor ${reactorId} with ${accessLevel} access`);

    res.json({
      success: true,
      message: 'User assigned to reactor successfully',
      data: assignment
    });
  } catch (error) {
    logger.error('Assign user to reactor error:', error);
    next(error);
  }
};

// Remove user from reactor
exports.removeUserFromReactor = async (req, res, next) => {
  try {
    const { userId, reactorId } = req.params;

    await User.removeFromReactor(userId, reactorId);

    logger.info(`User ${userId} removed from reactor ${reactorId}`);

    res.json({
      success: true,
      message: 'User removed from reactor successfully'
    });
  } catch (error) {
    logger.error('Remove user from reactor error:', error);
    next(error);
  }
};

// Reset user password (Admin only)
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // Generate password if not provided
    const password = newPassword || generatePassword();

    await User.updatePassword(userId, password);

    logger.info(`Password reset for user ${userId} by admin`);

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        generatedPassword: newPassword ? null : password
      }
    });
  } catch (error) {
    logger.error('Reset user password error:', error);
    next(error);
  }
};

module.exports = exports;