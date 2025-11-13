const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(authorize('admin'));

// @route   GET /api/v1/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', userController.getAllUsers);

// @route   POST /api/v1/users
// @desc    Create new user
// @access  Private/Admin
router.post('/', userController.createUser);

// @route   GET /api/v1/users/:userId
// @desc    Get user by ID
// @access  Private/Admin
router.get('/:userId', userController.getUserById);

// @route   PUT /api/v1/users/:userId
// @desc    Update user
// @access  Private/Admin
router.put('/:userId', userController.updateUser);

// @route   DELETE /api/v1/users/:userId
// @desc    Delete user
// @access  Private/Admin
router.delete('/:userId', userController.deleteUser);

// @route   POST /api/v1/users/:userId/reactors
// @desc    Assign user to reactor
// @access  Private/Admin
router.post('/:userId/reactors', userController.assignUserToReactor);

// @route   DELETE /api/v1/users/:userId/reactors/:reactorId
// @desc    Remove user from reactor
// @access  Private/Admin
router.delete('/:userId/reactors/:reactorId', userController.removeUserFromReactor);

// @route   POST /api/v1/users/:userId/reset-password
// @desc    Reset user password
// @access  Private/Admin
router.post('/:userId/reset-password', userController.resetUserPassword);

module.exports = router;