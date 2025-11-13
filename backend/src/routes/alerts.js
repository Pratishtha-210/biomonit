const express = require('express');
const router = express.Router();
const { 
  createSetPoint, 
  getSetPoints, 
  getUserSetPoints, 
  updateSetPoint, 
  deleteSetPoint,
  getAlerts,
  getAllAlerts,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
  acknowledgeMultipleAlerts,
  getAlertStats,
  getAlertById
} = require('../controllers/alertSetpointControllers');
const { authenticateToken, authorize, checkReactorAccess, checkReactorWriteAccess } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// ALERT ROUTES
// ============================================

// @route   GET /api/v1/alerts/all
// @desc    Get all alerts (admin only)
// @access  Private/Admin
router.get('/all', authorize('admin'), getAllAlerts);

// @route   GET /api/v1/alerts/:reactorId
// @desc    Get alerts for reactor
// @access  Private (with reactor access)
router.get('/:reactorId', checkReactorAccess, getAlerts);

// @route   GET /api/v1/alerts/:reactorId/unacknowledged
// @desc    Get unacknowledged alerts
// @access  Private (with reactor access)
router.get('/:reactorId/unacknowledged', checkReactorAccess, getUnacknowledgedAlerts);

// @route   GET /api/v1/alerts/:reactorId/statistics
// @desc    Get alert statistics
// @access  Private (with reactor access)
router.get('/:reactorId/statistics', checkReactorAccess, getAlertStats);

// @route   GET /api/v1/alerts/detail/:alertId
// @desc    Get alert by ID
// @access  Private
router.get('/detail/:alertId', getAlertById);

// @route   PUT /api/v1/alerts/:alertId/acknowledge
// @desc    Acknowledge alert
// @access  Private
router.put('/:alertId/acknowledge', acknowledgeAlert);

// @route   POST /api/v1/alerts/acknowledge-multiple
// @desc    Acknowledge multiple alerts
// @access  Private
router.post('/acknowledge-multiple', acknowledgeMultipleAlerts);

module.exports = router;