const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'bio_monitor',
  user: process.env.DB_USER || 'bio_monitor_app',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_MAX_POOL) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
});

// Test database connection
pool.on('connect', () => {
  logger.debug('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
});

// Query helper with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error:', { text, error: error.message });
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Get a client from pool (for complex operations)
const getClient = async () => {
  return await pool.connect();
};

// Test connection function
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    logger.info('Database connection test successful');
    logger.debug('Database info:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  query,
  transaction,
  getClient,
  testConnection
};