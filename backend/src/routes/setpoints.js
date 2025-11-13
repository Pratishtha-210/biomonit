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
// SETPOINT ROUTES
// ============================================

// @route   POST /api/v1/setpoints/:reactorId
// @desc    Create or update setpoint
// @access  Private (with write access)
router.post('/:reactorId', checkReactorWriteAccess, createSetPoint);

// @route   GET /api/v1/setpoints/:reactorId
// @desc    Get setpoints for reactor
// @access  Private (with reactor access)
router.get('/:reactorId', checkReactorAccess, getSetPoints);

// @route   GET /api/v1/setpoints/user/my-setpoints
// @desc    Get user's setpoints
// @access  Private
router.get('/user/my-setpoints', getUserSetPoints);

// @route   PUT /api/v1/setpoints/update/:setpointId
// @desc    Update setpoint
// @access  Private (owner or admin)
router.put('/update/:setpointId', updateSetPoint);

// @route   DELETE /api/v1/setpoints/:setpointId
// @desc    Delete setpoint
// @access  Private (owner or admin)
router.delete('/:setpointId', deleteSetPoint);



module.exports = router;