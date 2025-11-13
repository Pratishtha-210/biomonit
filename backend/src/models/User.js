const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

class User {
  // Create new user
  static async create(userData) {
    const { username, fullName, email, password, role } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (username, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, username, full_name, email, role, created_at`,
      [username, fullName, email, passwordHash, role]
    );

    return result.rows[0];
  }

  // Find user by ID
  static async findById(userId) {
    const result = await query(
      `SELECT user_id, username, full_name, email, role, is_active, created_at, last_login
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  // Find user by username
  static async findByUsername(username) {
    const result = await query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );

    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    return result.rows[0];
  }

  // Get all users (admin only)
  static async findAll(filters = {}) {
    let queryText = `
      SELECT user_id, username, full_name, email, role, is_active, created_at, last_login
      FROM users
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.role) {
      queryText += ` AND role = $${paramCount}`;
      params.push(filters.role);
      paramCount++;
    }

    if (filters.isActive !== undefined) {
      queryText += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
      paramCount++;
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, params);
    return result.rows;
  }

  // Update user
  static async update(userId, updates) {
    const allowedFields = ['full_name', 'email', 'role', 'is_active'];
    const updateFields = [];
    const params = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        params.push(updates[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(userId);

    const result = await query(
      `UPDATE users
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramCount}
       RETURNING user_id, username, full_name, email, role, is_active`,
      params
    );

    return result.rows[0];
  }

  // Update username
  static async updateUsername(userId, newUsername) {
    const result = await query(
      `UPDATE users
       SET username = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING user_id, username, full_name, email, role`,
      [newUsername, userId]
    );

    return result.rows[0];
  }

  // Update password
  static async updatePassword(userId, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [passwordHash, userId]
    );

    return true;
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update last login
  static async updateLastLogin(userId) {
    await query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId]
    );
  }

  // Delete user
  static async delete(userId) {
    await query('DELETE FROM users WHERE user_id = $1', [userId]);
    return true;
  }

  // Get user's assigned reactors
  static async getAssignedReactors(userId) {
    const result = await query(
      `SELECT 
        r.reactor_id,
        r.reactor_name,
        r.location,
        r.description,
        ura.access_level,
        ura.assigned_on
       FROM user_reactor_access ura
       JOIN reactors r ON ura.reactor_id = r.reactor_id
       WHERE ura.user_id = $1 AND r.is_active = true
       ORDER BY r.reactor_name`,
      [userId]
    );

    return result.rows;
  }

  // Assign user to reactor
  static async assignToReactor(userId, reactorId, accessLevel) {
    const result = await query(
      `INSERT INTO user_reactor_access (user_id, reactor_id, access_level)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, reactor_id) 
       DO UPDATE SET access_level = $3, assigned_on = CURRENT_TIMESTAMP
       RETURNING access_id, user_id, reactor_id, access_level`,
      [userId, reactorId, accessLevel]
    );

    return result.rows[0];
  }

  // Remove user from reactor
  static async removeFromReactor(userId, reactorId) {
    await query(
      `DELETE FROM user_reactor_access 
       WHERE user_id = $1 AND reactor_id = $2`,
      [userId, reactorId]
    );

    return true;
  }

  // Check if username exists
  static async usernameExists(username, excludeUserId = null) {
    let queryText = 'SELECT user_id FROM users WHERE username = $1';
    const params = [username];

    if (excludeUserId) {
      queryText += ' AND user_id != $2';
      params.push(excludeUserId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  // Check if email exists
  static async emailExists(email, excludeUserId = null) {
    let queryText = 'SELECT user_id FROM users WHERE email = $1';
    const params = [email];

    if (excludeUserId) {
      queryText += ' AND user_id != $2';
      params.push(excludeUserId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  }
}

module.exports = User;