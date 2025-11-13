const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send alert email
exports.sendAlertEmail = async (to, alertData) => {
  try {
    const transporter = createTransporter();

    const { reactorName, alertMessage, severity, fieldName, currentValue, thresholdValue } = alertData;

    const severityColor = {
      info: '#3498db',
      warning: '#f39c12',
      critical: '#e74c3c'
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${severityColor[severity]}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
          .alert-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${severityColor[severity]}; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .value { font-weight: bold; color: ${severityColor[severity]}; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Bio-Monitor Alert - ${severity.toUpperCase()}</h2>
          </div>
          <div class="content">
            <h3>Reactor: ${reactorName}</h3>
            <div class="alert-box">
              <p><strong>Alert Message:</strong></p>
              <p>${alertMessage}</p>
              <hr>
              <p><strong>Field:</strong> ${fieldName}</p>
              <p><strong>Current Value:</strong> <span class="value">${currentValue}</span></p>
              <p><strong>Threshold Value:</strong> ${thresholdValue}</p>
              <p><strong>Severity:</strong> <span class="value">${severity.toUpperCase()}</span></p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p>Please check the reactor system and take necessary action if required.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background: ${severityColor[severity]}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
          </div>
          <div class="footer">
            <p>This is an automated message from Bio-Monitor System</p>
            <p>Do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: `[${severity.toUpperCase()}] Bio-Monitor Alert: ${reactorName} - ${fieldName}`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Alert email sent to ${to}: ${info.messageId}`);
    
    return info;
  } catch (error) {
    logger.error('Error sending alert email:', error);
    throw error;
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (to, userData) => {
  try {
    const transporter = createTransporter();

    const { username, password, fullName } = userData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .credentials { background: white; padding: 15px; margin: 15px 0; border: 1px solid #ddd; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Welcome to Bio-Monitor System</h2>
          </div>
          <div class="content">
            <p>Hello ${fullName},</p>
            <p>Your account has been created successfully. Below are your login credentials:</p>
            <div class="credentials">
              <p><strong>Username:</strong> ${username}</p>
              <p><strong>Temporary Password:</strong> ${password}</p>
            </div>
            <p><strong>Important:</strong> Please change your password after your first login for security reasons.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Login Now</a></p>
          </div>
          <div class="footer">
            <p>Bio-Monitor System - Real-time Bioreactor Monitoring</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Welcome to Bio-Monitor - Your Account Details',
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${to}: ${info.messageId}`);
    
    return info;
  } catch (error) {
    logger.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (to, userData) => {
  try {
    const transporter = createTransporter();

    const { username, newPassword } = userData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .credentials { background: white; padding: 15px; margin: 15px 0; border: 1px solid #ddd; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Password Reset - Bio-Monitor</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your password for username <strong>${username}</strong> has been reset by the administrator.</p>
            <div class="credentials">
              <p><strong>New Temporary Password:</strong> ${newPassword}</p>
            </div>
            <p><strong>Important:</strong> Please login and change your password immediately.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Login Now</a></p>
          </div>
          <div class="footer">
            <p>If you did not request this password reset, please contact your administrator immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Password Reset - Bio-Monitor System',
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to}: ${info.messageId}`);
    
    return info;
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    throw error;
  }
};

// Test email configuration
exports.testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email configuration is valid');
    return true;
  } catch (error) {
    logger.error('Email configuration error:', error);
    return false;
  }
};

module.exports = exports;