const express = require('express');
const router = express.Router();
const reactorController = require('../controllers/reactorController');
const { authenticateToken, authorize, checkReactorAccess } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// @route   GET /api/v1/reactors
// @desc    Get all reactors (based on user role)
// @access  Private
router.get('/', reactorController.getAllReactors);

// @route   POST /api/v1/reactors
// @desc    Create new reactor
// @access  Private/Admin
router.post('/', authorize('admin'), reactorController.createReactor);

// @route   GET /api/v1/reactors/:reactorId
// @desc    Get reactor by ID
// @access  Private (with reactor access)
router.get('/:reactorId', checkReactorAccess, reactorController.getReactorById);

// @route   PUT /api/v1/reactors/:reactorId
// @desc    Update reactor
// @access  Private/Admin
router.put('/:reactorId', authorize('admin'), reactorController.updateReactor);

// @route   DELETE /api/v1/reactors/:reactorId
// @desc    Delete reactor
// @access  Private/Admin
router.delete('/:reactorId', authorize('admin'), reactorController.deleteReactor);

// @route   GET /api/v1/reactors/:reactorId/equipment
// @desc    Get reactor equipment
// @access  Private (with reactor access)
router.get('/:reactorId/equipment', checkReactorAccess, reactorController.getReactorEquipment);

// @route   POST /api/v1/reactors/:reactorId/equipment
// @desc    Add equipment to reactor
// @access  Private/Admin
router.post('/:reactorId/equipment', authorize('admin'), reactorController.addEquipment);

// @route   GET /api/v1/reactors/:reactorId/users
// @desc    Get assigned users
// @access  Private (with reactor access)
router.get('/:reactorId/users', checkReactorAccess, reactorController.getAssignedUsers);

// @route   GET /api/v1/reactors/:reactorId/statistics
// @desc    Get reactor statistics
// @access  Private (with reactor access)
router.get('/:reactorId/statistics', checkReactorAccess, reactorController.getStatistics);

// @route   GET /api/v1/reactors/:reactorId/status
// @desc    Get latest reactor status
// @access  Private (with reactor access)
router.get('/:reactorId/status', checkReactorAccess, reactorController.getLatestStatus);

module.exports = router;