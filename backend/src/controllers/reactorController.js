const Reactor = require('../models/Reactor');
const logger = require('../utils/logger');

// Get all reactors (based on user role)
exports.getAllReactors = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const filters = {};
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    let reactors;
    if (req.user.role === 'admin') {
      reactors = await Reactor.findAll(filters);
    } else {
      reactors = await Reactor.findByUserId(req.user.userId, req.user.role);
    }

    res.json({
      success: true,
      count: reactors.length,
      data: reactors
    });
  } catch (error) {
    logger.error('Get all reactors error:', error);
    next(error);
  }
};

// Get reactor by ID
exports.getReactorById = async (req, res, next) => {
  try {
    const { reactorId } = req.params;

    const reactor = await Reactor.findById(reactorId);

    if (!reactor) {
      return res.status(404).json({
        success: false,
        message: 'Reactor not found'
      });
    }

    // Get additional info
    const equipment = await Reactor.getEquipment(reactorId);
    const assignedUsers = await Reactor.getAssignedUsers(reactorId);
    const latestStatus = await Reactor.getLatestStatus(reactorId);
    const statistics = await Reactor.getStatistics(reactorId);

    res.json({
      success: true,
      data: {
        ...reactor,
        equipment,
        assignedUsers,
        latestStatus,
        statistics
      }
    });
  } catch (error) {
    logger.error('Get reactor by ID error:', error);
    next(error);
  }
};

// Create new reactor (Admin only)
exports.createReactor = async (req, res, next) => {
  try {
    const { reactorName, location, description, dataRetentionDays } = req.body;

    if (!reactorName) {
      return res.status(400).json({
        success: false,
        message: 'Reactor name is required'
      });
    }

    // Check if reactor name exists
    const nameExists = await Reactor.nameExists(reactorName);
    if (nameExists) {
      return res.status(400).json({
        success: false,
        message: 'Reactor name already exists'
      });
    }

    const reactorData = {
      reactorName,
      location,
      description,
      dataRetentionDays
    };

    const newReactor = await Reactor.create(reactorData);

    logger.info(`Reactor created: ${reactorName}`);

    res.status(201).json({
      success: true,
      message: 'Reactor created successfully',
      data: newReactor
    });
  } catch (error) {
    logger.error('Create reactor error:', error);
    next(error);
  }
};

// Update reactor (Admin only)
exports.updateReactor = async (req, res, next) => {
  try {
    const { reactorId } = req.params;
    const { reactorName, location, description, dataRetentionDays, isActive } = req.body;

    const updates = {};
    if (reactorName !== undefined) {
      // Check if new name already exists
      const nameExists = await Reactor.nameExists(reactorName, reactorId);
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Reactor name already exists'
        });
      }
      updates.reactor_name = reactorName;
    }
    if (location !== undefined) updates.location = location;
    if (description !== undefined) updates.description = description;
    if (dataRetentionDays !== undefined) updates.data_retention_days = dataRetentionDays;
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const updatedReactor = await Reactor.update(reactorId, updates);

    if (!updatedReactor) {
      return res.status(404).json({
        success: false,
        message: 'Reactor not found'
      });
    }

    logger.info(`Reactor updated: ${reactorId}`);

    res.json({
      success: true,
      message: 'Reactor updated successfully',
      data: updatedReactor
    });
  } catch (error) {
    logger.error('Update reactor error:', error);
    next(error);
  }
};

// Delete reactor (Admin only)
exports.deleteReactor = async (req, res, next) => {
  try {
    const { reactorId } = req.params;

    const reactor = await Reactor.findById(reactorId);
    if (!reactor) {
      return res.status(404).json({
        success: false,
        message: 'Reactor not found'
      });
    }

    await Reactor.delete(reactorId);

    logger.info(`Reactor deleted: ${reactorId}`);

    res.json({
      success: true,
      message: 'Reactor deleted successfully'
    });
  } catch (error) {
    logger.error('Delete reactor error:', error);
    next(error);
  }
};

// Get reactor equipment
exports.getReactorEquipment = async (req, res, next) => {
  try {
    const { reactorId } = req.params;

    const equipment = await Reactor.getEquipment(reactorId);

    res.json({
      success: true,
      count: equipment.length,
      data: equipment
    });
  } catch (error) {
    logger.error('Get reactor equipment error:', error);
    next(error);
  }
};

// Add equipment to reactor
exports.addEquipment = async (req, res, next) => {
  try {
    const { reactorId } = req.params;
    const { name, type, manufacturer, serialNumber, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Equipment name is required'
      });
    }

    const equipmentData = {
      name,
      type,
      manufacturer,
      serialNumber,
      description
    };

    const newEquipment = await Reactor.addEquipment(reactorId, equipmentData);

    logger.info(`Equipment added to reactor ${reactorId}: ${name}`);

    res.status(201).json({
      success: true,
      message: 'Equipment added successfully',
      data: newEquipment
    });
  } catch (error) {
    logger.error('Add equipment error:', error);
    next(error);
  }
};

// Get assigned users
exports.getAssignedUsers = async (req, res, next) => {
  try {
    const { reactorId } = req.params;

    const users = await Reactor.getAssignedUsers(reactorId);

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error('Get assigned users error:', error);
    next(error);
  }
};

// Get reactor statistics
exports.getStatistics = async (req, res, next) => {
  try {
    const { reactorId } = req.params;

    const statistics = await Reactor.getStatistics(reactorId);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get reactor statistics error:', error);
    next(error);
  }
};

// Get latest reactor status
exports.getLatestStatus = async (req, res, next) => {
  try {
    const { reactorId } = req.params;

    const status = await Reactor.getLatestStatus(reactorId);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'No data available for this reactor'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Get latest status error:', error);
    next(error);
  }
};

module.exports = exports;