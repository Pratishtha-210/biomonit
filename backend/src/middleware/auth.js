const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const userResult = await query(
      'SELECT user_id, username, role, is_active FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'User account is inactive' 
      });
    }

    // Attach user info to request
    req.user = {
      userId: user.user_id,
      username: user.username,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    logger.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// Role-based authorization
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Check if user has access to specific reactor
const checkReactorAccess = async (req, res, next) => {
  try {
    const { reactorId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Admin has access to all reactors
    if (userRole === 'admin') {
      return next();
    }

    // Check if user has access to this reactor
    const accessResult = await query(
      `SELECT access_id, access_level 
       FROM user_reactor_access 
       WHERE user_id = $1 AND reactor_id = $2`,
      [userId, reactorId]
    );
    //console.log(accessResult.rows);
    logger.info(`User ${userId} access check for reactor ${reactorId}: ${accessResult.rows.length} records found`);
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'No access to this reactor' 
      });
    }

    // Attach access level to request
    req.reactorAccess = accessResult.rows[0].access_level;
    next();
  } catch (error) {
    logger.error('Reactor access check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking reactor access' 
    });
  }
};

// Check write permissions for reactor
const checkReactorWriteAccess = async (req, res, next) => {
  try {
    const { reactorId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Admin has write access to all reactors
    if (userRole === 'admin') {
      return next();
    }

    // Check if user has write access to this reactor
    const accessResult = await query(
      `SELECT access_level 
       FROM user_reactor_access 
       WHERE user_id = $1 AND reactor_id = $2 
       AND access_level IN ('owner', 'operator')`,
      [userId, reactorId]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Write access denied for this reactor' 
      });
    }

    next();
  } catch (error) {
    logger.error('Reactor write access check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking write access' 
    });
  }
};

module.exports = {
  authenticateToken,
  authorize,
  checkReactorAccess,
  checkReactorWriteAccess
};