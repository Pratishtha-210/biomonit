const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}, User: ${socket.userId}`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Subscribe to reactor data stream
    socket.on('subscribe:reactor', (reactorId) => {
      logger.info(`User ${socket.userId} subscribed to reactor ${reactorId}`);
      socket.join(`reactor:${reactorId}`);
      socket.emit('subscribed', { reactorId });
    });

    // Unsubscribe from reactor data stream
    socket.on('unsubscribe:reactor', (reactorId) => {
      logger.info(`User ${socket.userId} unsubscribed from reactor ${reactorId}`);
      socket.leave(`reactor:${reactorId}`);
      socket.emit('unsubscribed', { reactorId });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`Socket error for client ${socket.id}:`, error);
    });
  });

  logger.info('Socket.IO initialized successfully');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Emit new data to subscribed clients
const emitReactorData = (reactorId, dataType, data) => {
  if (io) {
    io.to(`reactor:${reactorId}`).emit('reactor:data', {
      reactorId,
      dataType,
      data,
      timestamp: new Date()
    });
  }
};

// Emit alert to relevant users
const emitAlert = (reactorId, alert) => {
  if (io) {
    // Send to all clients subscribed to this reactor
    io.to(`reactor:${reactorId}`).emit('reactor:alert', alert);
    
    // Send to all admin users
    io.emit('admin:alert', alert);
  }
};

// Emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitReactorData,
  emitAlert,
  emitToUser
};