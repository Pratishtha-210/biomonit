// src/routes/data.js

const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { authenticateToken, authorize, checkReactorAccess, checkReactorWriteAccess } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// IMPORTANT: Specific routes MUST come BEFORE generic :dataType routes
// Otherwise :dataType will match "dashboard" as a data type

// @route   GET /api/v1/data/:reactorId/dashboard
// @desc    Get all latest data for dashboard
// @access  Private (with reactor access)
router.get('/:reactorId/dashboard', checkReactorAccess, dataController.getDashboardData);

// @route   GET /api/v1/data/:reactorId/time-range
// @desc    Get data for time range (all types)
// @access  Private (with reactor access)
router.get('/:reactorId/time-range', checkReactorAccess, dataController.getDataByTimeRange);

// Generic :dataType routes come AFTER specific routes
// @route   GET /api/v1/data/:reactorId/:dataType
// @desc    Get reactor data (dilution, gas, level_control)
// @access  Private (with reactor access)
router.get('/:reactorId/:dataType', checkReactorAccess, dataController.getReactorData);

// @route   GET /api/v1/data/:reactorId/:dataType/latest
// @desc    Get latest reactor data
// @access  Private (with reactor access)
router.get('/:reactorId/:dataType/latest', checkReactorAccess, dataController.getLatestData);

// @route   POST /api/v1/data/:reactorId/:dataType
// @desc    Insert reactor data (from LabVIEW or external source)
// @access  Private (with write access)
router.post('/:reactorId/:dataType', checkReactorWriteAccess, dataController.insertReactorData);

// @route   GET /api/v1/data/:reactorId/:dataType/statistics
// @desc    Get field statistics
// @access  Private (with reactor access)
router.get('/:reactorId/:dataType/statistics', checkReactorAccess, dataController.getFieldStatistics);

// @route   GET /api/v1/data/:reactorId/:dataType/multi-field
// @desc    Get multiple fields data (for multi-axis charts)
// @access  Private (with reactor access)
router.get('/:reactorId/:dataType/multi-field', checkReactorAccess, dataController.getMultiFieldData);

// @route   DELETE /api/v1/data/:reactorId/:dataType/old
// @desc    Delete old data
// @access  Private/Admin
router.delete('/:reactorId/:dataType/old', authorize('admin'), dataController.deleteOldData);

// @route   GET /api/v1/data/:reactorId/:dataType/export
// @desc    Export data as CSV
// @access  Private (with reactor access)
router.get('/:reactorId/:dataType/export', checkReactorAccess, dataController.exportData);

module.exports = router;