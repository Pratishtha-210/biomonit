// src/utils/helpers.js

/**
 * Format date to ISO string
 */
const formatDate = (date) => {
    return new Date(date).toISOString();
  };
  
  /**
   * Generate random string
   */
  const generateRandomString = (length = 16) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  /**
   * Validate email format
   */
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Sanitize user input
   */
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  };
  
  /**
   * Calculate time difference in minutes
   */
  const getTimeDifferenceInMinutes = (date1, date2) => {
    const diff = Math.abs(new Date(date1) - new Date(date2));
    return Math.floor(diff / 1000 / 60);
  };
  
  /**
   * Format number to fixed decimal places
   */
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return null;
    return Number(num).toFixed(decimals);
  };
  
  /**
   * Paginate array
   */
  const paginate = (array, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return {
      data: array.slice(startIndex, endIndex),
      page,
      limit,
      total: array.length,
      totalPages: Math.ceil(array.length / limit)
    };
  };
  
  module.exports = {
    formatDate,
    generateRandomString,
    isValidEmail,
    sanitizeInput,
    getTimeDifferenceInMinutes,
    formatNumber,
    paginate
  };