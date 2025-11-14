// src/pages/ReactorDetail.jsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ShowChart as ChartIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { getReactorById } from '../api/reactors';
import { useDashboardData } from '../hooks/useReactorData';
import { useSocket } from '../hooks/useSocket';
import Loading from '../components/Common/Loading';
import ErrorMessage from '../components/Common/ErrorMessage';
import { formatDate, formatNumber } from '../utils/helpers';

const ReactorDetail = () => {
  const { reactorId } = useParams();
  const navigate = useNavigate();
  const { subscribeToReactor, unsubscribeFromReactor } = useSocket();

  // Subscribe to reactor on mount
  useEffect(() => {
    if (reactorId) {
      subscribeToReactor(reactorId);
    }
    return () => {
      if (reactorId) {
        unsubscribeFromReactor(reactorId);
      }
    };
  }, [reactorId, subscribeToReactor, unsubscribeFromReactor]);

  // Fetch reactor details
  const {
    data: reactorData,
    isLoading: loadingReactor,
    error: reactorError,
    refetch: refetchReactor,
  } = useQuery({
    queryKey: ['reactor', reactorId],
    queryFn: () => getReactorById(reactorId),
  });

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading: loadingDashboard,
  } = useDashboardData(reactorId);

  if (loadingReactor) return <Loading message="Loading reactor details..." />;
  if (reactorError) return <ErrorMessage message={reactorError.message} onRetry={refetchReactor} />;

  const reactor = reactorData?.data;
  const latestData = dashboardData?.data?.latest;
  const statistics = reactor?.statistics;
  console.log("latestData",latestData);
  console.log("formatted data",formatDate(latestData.dilution.uploaded_at))

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/reactors')}>
          Back
        </Button>
        <Box flexGrow={1}>
          <Typography variant="h4" fontWeight="bold">
            {reactor?.reactor_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {reactor?.location}
          </Typography>
        </Box>
        <Chip
          label={reactor?.is_active ? 'Active' : 'Inactive'}
          color={reactor?.is_active ? 'success' : 'default'}
        />
        <Button
          variant="contained"
          startIcon={<ChartIcon />}
          onClick={() => navigate(`/reactors/${reactorId}/data`)}
        >
          View Data
        </Button>
      </Box>

      {/* Reactor Info */}
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Reactor ID"
                    secondary={reactor?.reactor_id}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Location"
                    secondary={reactor?.location || 'Not specified'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Description"
                    secondary={reactor?.description || 'No description'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Data Retention"
                    secondary={`${reactor?.data_retention_days} days`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Created"
                    secondary={formatDate(reactor?.created_at)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Statistics
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loadingDashboard ? (
                <Loading message="Loading statistics..." />
              ) : (
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Total Data Records"
                      secondary={
                        parseInt(statistics?.dilution_records || 0) +
                        parseInt(statistics?.gas_records || 0) +
                        parseInt(statistics?.level_records || 0)
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Dilution Records"
                      secondary={statistics?.dilution_records || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Gas Records"
                      secondary={statistics?.gas_records || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Level Control Records"
                      secondary={statistics?.level_records || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Total Alerts"
                      secondary={statistics?.total_alerts || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Unacknowledged Alerts"
                      secondary={statistics?.unack_alerts || 0}
                    />
                  </ListItem>
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Latest Data - Gas */}
        {latestData?.gas && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Latest Gas Data
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        pH
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.gas.pH)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        DO
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.gas.DO)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        Temp (°C)
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.gas.reactor_temp)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        OUR
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.gas.OUR)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Updated: {formatDate(latestData.gas.timestamp)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Latest Data - Dilution */}
        {latestData?.dilution && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Latest Dilution Data
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        Flow Rate
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.dilution.flowrate)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        Dilution Rate
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.dilution.dilution_rate)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        Volume
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.dilution.volume_reactor)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Updated: {formatDate(latestData.dilution.uploaded_at)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Latest Data - Level Control */}
        {latestData?.level_control && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Latest Level Control
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        Weight (kg)
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.level_control.reactor_weight)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        Volume (L)
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.level_control.volume_reactor)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        PID Value
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.level_control.pid_value)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default' }}>
                      <Typography variant="caption" color="text.secondary">
                        Pump RPM
                      </Typography>
                      <Typography variant="h6">
                        {formatNumber(latestData.level_control.pump_rpm)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Updated: {formatDate(latestData.level_control.timestamp)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Equipment List */}
        {reactor?.equipment && reactor.equipment.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Equipment
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {reactor.equipment.map((equipment) => (
                    <Grid item xs={12} sm={6} md={4} key={equipment.equipment_id}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {equipment.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Type: {equipment.type || 'N/A'}
                        </Typography>
                        {equipment.manufacturer && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {equipment.manufacturer}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ReactorDetail;