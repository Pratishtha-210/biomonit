const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const reactorRoutes = require('./routes/reactors');
const dataRoutes = require('./routes/data');
const dataUpRoutes = require('./routes/dataup');
const alertSetpointRoutes = require('./routes/alerts');
const setPointRoutes = require('./routes/setpoints');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// Enable CORS - Allow all origins dynamically
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins (including requests with no origin)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// HTTP request loggerrouter.post('/push-data', dataController.pushDataToDatabase);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// ============================================
// ROUTES
// ============================================

const API_VERSION = process.env.API_VERSION || 'v1';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bio-Monitor API is running',
    timestamp: new Date().toISOString(),
    version: API_VERSION
  });
});

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/reactors`, reactorRoutes);
app.use(`/api/${API_VERSION}/data`, dataRoutes);
app.use(`/api/${API_VERSION}/alerts`, alertSetpointRoutes);
app.use(`/api/${API_VERSION}/setpoints`, setPointRoutes);
app.use(`/api/${API_VERSION}/dataup`, dataUpRoutes); // push 

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Bio-Monitor API',
    version: API_VERSION,
    documentation: '/api/docs',
    endpoints: {
      auth: `/api/${API_VERSION}/auth`,
      users: `/api/${API_VERSION}/users`,
      reactors: `/api/${API_VERSION}/reactors`,
      data: `/api/${API_VERSION}/data`,
      alerts: `/api/${API_VERSION}/alerts`,
      setpoints: `/api/${API_VERSION}/setpoints`
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = app;