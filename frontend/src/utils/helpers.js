// src/utils/helpers.js

import { formatDistance } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return formatInTimeZone(date, 'UTC', 'MMM dd, yyyy HH:mm:ss');
};

export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
};

export const formatNumber = (num, precision = 3) => {
  if (num === null || num === undefined) return 'N/A';
  const value = Number(num);
  if (Number.isNaN(value)) return 'N/A';
  return value.toFixed(precision);
};

export const downloadCSV = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getAlertSeverityColor = (severity) => {
  const colors = {
    info: '#2196f3',
    warning: '#ff9800',
    critical: '#f44336',
  };
  return colors[severity] || colors.warning;
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};