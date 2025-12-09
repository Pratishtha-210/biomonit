// src/components/Charts/ProfessionalLineChart.jsx

import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { formatDate, formatNumber } from '../../utils/helpers';

const ProfessionalLineChart = ({ data, fieldName, title, color = '#1976d2', height = 600 }) => {
  // Prepare and decimate chart data for performance
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Decimate data if too many points (keep every nth point)
    const maxPoints = 1000;
    const step = Math.max(1, Math.floor(data.length / maxPoints));
    return data
      .filter((_, index) => index % step === 0)
      .map((item) => ({
        timestamp: formatDate(item.timestamp),
        value: item[fieldName],
        fullTimestamp: item.timestamp,
      }));
  }, [data, fieldName]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const values = chartData.map(d => d.value).filter(v => v !== null && v !== undefined);
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1],
      count: values.length,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 3,
          }}
        >
          <Typography variant="caption" display="block" fontWeight="bold">
            {format(new Date(payload[0].payload.fullTimestamp), 'MMM dd, yyyy HH:mm:ss')}
          </Typography>
          <Typography variant="body1" fontWeight="bold" color={color} mt={1}>
            {title}: {payload[0].value?.toFixed(4)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <Card elevation={3} width="100vh">
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            {title} klf
          </Typography>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={height}
          >
            <Typography variant="body2" color="text.secondary">
              No data available for selected time range
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3} sx={{ width: '100%'}}>
      <CardContent sx={{width: '100%'}}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <Chip label={`${chartData.length} points`} size="small" variant="outlined" />
        </Box>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart data={chartData} >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
              stroke="#666"
            />
            <YAxis
              datakey="value"
              tick={{ fontSize: 12 }}
              stroke="#666"
              domain={['auto', 'auto']}
              tickFormatter={(value) => value.toFixed(4)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />
            {stats && <ReferenceLine y={stats.avg} stroke="#ff7300" strokeDasharray="3 3" label="Avg" />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={title}
              isAnimationActive={false}
            />
            <Brush
              dataKey="timestamp"
              height={30}
              stroke={color}
              fill="#f5f5f5"
            />
          </RechartsLineChart>
        </ResponsiveContainer>

        {/* Statistics */}
        {stats && (
          <Box
            display="flex"
            justifyContent="space-around"
            flexWrap="wrap"
            gap={2}
            mt={2}
            p={2}
            bgcolor="background.default"
            borderRadius={1}
          >
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                Latest
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {stats.latest}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                Average
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {stats.avg}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                Min
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {stats.min}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">
                Max
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="error">
                {stats.max}
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionalLineChart;