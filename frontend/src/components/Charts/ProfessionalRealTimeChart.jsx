// src/components/Charts/RealTimeChart.jsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSocket } from '../../hooks/useSocket';
import { format } from 'date-fns';

const RealTimeChart = ({ reactorId, dataType, fieldName, title, color = '#1976d2' }) => {
  const { realtimeData } = useSocket();
  const [chartData, setChartData] = useState([]);
  const MAX_POINTS = 50;

  useEffect(() => {
    if (
      realtimeData &&
      realtimeData.reactorId === parseInt(reactorId) &&
      realtimeData.dataType === dataType
    ) {
      const newDataPoint = {
        timestamp: format(new Date(realtimeData.timestamp), 'HH:mm:ss'),
        value: realtimeData.data[fieldName],
        fullTimestamp: realtimeData.timestamp,
      };

      setChartData((prevData) => {
        const newData = [...prevData, newDataPoint];
        // Keep only last MAX_POINTS
        return newData.slice(-MAX_POINTS);
      });
    }
  }, [realtimeData, reactorId, dataType, fieldName]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" display="block">
            Time: {payload[0].payload.timestamp}
          </Typography>
          <Typography variant="caption" display="block" fontWeight="bold">
            {title}: {payload[0].value?.toFixed(2)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <Chip
            label={`${chartData.length} points`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {chartData.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={300}
          >
            <Typography variant="body2" color="text.secondary">
              Waiting for real-time data...
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
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
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                name={title}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            Latest value: {chartData[chartData.length - 1]?.value?.toFixed(2) || 'N/A'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RealTimeChart;