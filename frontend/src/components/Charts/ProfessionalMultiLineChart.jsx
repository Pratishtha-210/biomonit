// src/components/Charts/MultiLineChart.jsx

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import usePrecisionStore from '../../store/precisionStore';
import { formatDate, formatNumber } from '../../utils/helpers';

const COLORS = ['#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#9c27b0', '#00acc1'];

const MultiLineChart = ({ data, fields, title, height = 400 }) => {
  // Prepare chart data
  const precision = usePrecisionStore((state) => state.precision);
  const chartData = data.map((item) => {
    const point = {
      timestamp: format(new Date(item.timestamp), 'MM/dd HH:mm'),
      fullTimestamp: item.timestamp,
    };
    fields.forEach((field) => {
      point[field.key] = item[field.key];
    });
    return point;
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="caption" display="block" mb={1}>
            {formatDate(payload[0].payload.fullTimestamp)}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="caption"
              display="block"
              sx={{ color: entry.color }}
            >
              <strong>{entry.name}:</strong> {formatNumber(payload?.[0]?.value, precision)}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            {title}
          </Typography>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={height}
          >
            <Typography variant="body2" color="text.secondary">
              No data available
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              reversed
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {fields.map((field, index) => (
              <Line
                key={field.key}
                type="monotone"
                dataKey={field.key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={field.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            Data points: {chartData.length}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MultiLineChart;