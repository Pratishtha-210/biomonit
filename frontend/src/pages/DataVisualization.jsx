// src/pages/DataVisualization.jsx - PROFESSIONAL VERSION

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Divider,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ViewModule as GridIcon,
  ViewStream as StackIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { getReactorById } from '../api/reactors';
import { getDataByTimeRange, exportData } from '../api/data';
import { useSocket } from '../hooks/useSocket';
import Loading from '../components/Common/Loading';
import ErrorMessage from '../components/Common/ErrorMessage';
import ProfessionalLineChart from '../components/Charts/ProfessionalLineChart';
import ProfessionalMultiLineChart from '../components/Charts/ProfessionalMultiLineChart';
import ProfessionalRealTimeChart from '../components/Charts/ProfessionalRealTimeChart';
import { DATA_TYPES, DILUTION_FIELDS, GAS_FIELDS, LEVEL_CONTROL_FIELDS } from '../utils/constants';
import { downloadCSV } from '../utils/helpers';
import { toast } from 'react-toastify';

const DataVisualization = () => {
  const { reactorId } = useParams();
  const navigate = useNavigate();
  const { subscribeToReactor, unsubscribeFromReactor, isConnected } = useSocket();

  const [timeRange, setTimeRange] = useState(24);
  const [selectedDataType, setSelectedDataType] = useState('gas');
  const [selectedFields, setSelectedFields] = useState(['our']);
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'stack'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartHeight, setChartHeight] = useState(600);
  const [settingsAnchor, setSettingsAnchor] = useState(null);

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

  const { data: reactorData } = useQuery({
    queryKey: ['reactor', reactorId],
    queryFn: () => getReactorById(reactorId),
  });

  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reactorData', reactorId, timeRange],
    queryFn: () => getDataByTimeRange(reactorId, timeRange),
    refetchInterval: 60000,
  });

  const reactor = reactorData?.data;
  const allData = historyData?.data || {};

  const getFieldsForDataType = (dataType) => {
    switch (dataType) {
      case 'dilution':
        return DILUTION_FIELDS;
      case 'gas':
        return GAS_FIELDS;
      case 'level_control':
        return LEVEL_CONTROL_FIELDS;
      default:
        return [];
    }
  };

  const handleExport = async () => {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime - timeRange * 60 * 60 * 1000);
      
      const blob = await exportData(reactorId, selectedDataType, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      
      downloadCSV(blob, `reactor_${reactorId}_${selectedDataType}_${Date.now()}.csv`);
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleFieldToggle = (fieldKey) => {
    if (selectedFields.includes(fieldKey)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter(f => f !== fieldKey));
      }
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  const handleSelectAllFields = () => {
    const allFieldKeys = getFieldsForDataType(selectedDataType).map(f => f.key);
    setSelectedFields(allFieldKeys);
  };

  const handleDeselectAllFields = () => {
    const firstField = getFieldsForDataType(selectedDataType)[0]?.key;
    setSelectedFields(firstField ? [firstField] : []);
  };

  if (isLoading) return <Loading message="Loading data..." />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />;

  const currentData = allData[selectedDataType] || [];
  const availableFields = getFieldsForDataType(selectedDataType);

  return (
    <Box sx={{ height: isFullscreen ? '100vh' : 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        <Button startIcon={<BackIcon />} onClick={() => navigate(`/reactors/${reactorId}`)}>
          Back
        </Button>
        <Box flexGrow={1}>
          <Typography variant="h4" fontWeight="bold">
            Data Visualization
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {reactor?.reactor_name}
          </Typography>
        </Box>
        <Chip
          label={isConnected ? 'Live' : 'Offline'}
          color={isConnected ? 'success' : 'default'}
          size="small"
        />
        <Tooltip title="Refresh Data">
          <IconButton onClick={refetch} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          <IconButton onClick={toggleFullscreen} color="primary">
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          Export
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
          <Tab label="Historical Data" />
          <Tab label="Real-time Monitoring" />
        </Tabs>
      </Paper>

      {/* Controls */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Data Type</InputLabel>
              <Select
                value={selectedDataType}
                label="Data Type"
                onChange={(e) => {
                  setSelectedDataType(e.target.value);
                  setSelectedFields([]);
                }}
              >
                <MenuItem value="dilution">Dilution Data</MenuItem>
                <MenuItem value="gas">Gas Data</MenuItem>
                <MenuItem value="level_control">Level Control</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value={1}>Last 1 Hour</MenuItem>
                <MenuItem value={6}>Last 6 Hours</MenuItem>
                <MenuItem value={12}>Last 12 Hours</MenuItem>
                <MenuItem value={24}>Last 24 Hours</MenuItem>
                <MenuItem value={48}>Last 48 Hours</MenuItem>
                <MenuItem value={168}>Last Week</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Chart Height</InputLabel>
              <Select
                value={chartHeight}
                label="Chart Height"
                onChange={(e) => setChartHeight(e.target.value)}
              >
                <MenuItem value={400}>Small (400px)</MenuItem>
                <MenuItem value={600}>Medium (600px)</MenuItem>
                <MenuItem value={800}>Large (800px)</MenuItem>
                <MenuItem value={1000}>Extra Large (1000px)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, val) => val && setViewMode(val)}
              size="small"
              fullWidth
            >
              <ToggleButton value="grid">
                <GridIcon sx={{ mr: 1 }} />
                Grid
              </ToggleButton>
              <ToggleButton value="stack">
                <StackIcon sx={{ mr: 1 }} />
                Stack
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Field Selection */}
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Select Fields ({selectedFields.length} selected):
            </Typography>
            <Box>
              <Button size="small" onClick={handleSelectAllFields}>
                Select All
              </Button>
              <Button size="small" onClick={handleDeselectAllFields}>
                Clear
              </Button>
            </Box>
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {availableFields.map((field) => (
              <Chip
                key={field.key}
                label={field.label}
                onClick={() => handleFieldToggle(field.key)}
                color={selectedFields.includes(field.key) ? 'primary' : 'default'}
                variant={selectedFields.includes(field.key) ? 'filled' : 'outlined'}
                clickable
              />
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Historical Data Tab */}
      {tabValue === 0 && (
        <Box flexGrow={1}>
          {selectedFields.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Please select at least one field to visualize
              </Typography>
            </Paper>
          ) : viewMode === 'stack' ? (
            // Stacked View
            <>
              {/* Combined Chart */}
              {selectedFields.length > 1 && (
              <Box mb={2}>
                <ProfessionalMultiLineChart
                  data={currentData}
                  fields={selectedFields.map((key) => ({
                    key,
                    label: availableFields.find((f) => f.key === key)?.label || key,
                  }))}
                  title="Combined View"
                  height={chartHeight}
                />
              </Box>
            )}
            {/* Individual Charts */}
              {selectedFields.map((fieldKey) => (
                <Box mb={2}>
                  <Grid item xs={12} key={fieldKey}>
                    <ProfessionalLineChart
                      data={currentData}
                      fieldName={fieldKey}
                      title={availableFields.find((f) => f.key === fieldKey)?.label}
                      height={chartHeight}
                    />
                  </Grid>
                </Box>
              ))}
            </>
          ) : (
            // Grid View
            <>
              {/* Combined Chart */}
              {selectedFields.length > 1 && (
                <Box mb={2}>
                  <ProfessionalMultiLineChart
                    data={currentData}
                    fields={selectedFields.map((key) => ({
                      key,
                      label: availableFields.find((f) => f.key === key)?.label || key,
                    }))}
                    title="Combined View"
                    height={chartHeight}
                  />
                </Box>
              )}

              {/* Individual Charts */}
              <Grid container spacing={2}>
                {selectedFields.map((fieldKey) => (
                  <Grid item xs={12} md={selectedFields.length === 1 ? 12 : 6} key={fieldKey}>
                    <ProfessionalLineChart
                      data={currentData}
                      fieldName={fieldKey}
                      title={availableFields.find((f) => f.key === fieldKey)?.label}
                      height={selectedFields.length === 1 ? chartHeight : chartHeight * 0.7}
                      width="100%"
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      )}

      {/* Real-time Tab */}
      {tabValue === 1 && (
        <Box flexGrow={1}>
          {!isConnected ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Real-time connection is not active
              </Typography>
            </Paper>
          ) : selectedFields.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Please select fields to monitor in real-time
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {selectedFields.map((fieldKey) => (
                <Grid 
                  item 
                  xs={12} 
                  md={viewMode === 'stack' ? 12 : selectedFields.length === 1 ? 12 : 6} 
                  key={fieldKey}
                >
                  <ProfessionalRealTimeChart
                    reactorId={reactorId}
                    dataType={selectedDataType}
                    fieldName={fieldKey}
                    title={availableFields.find((f) => f.key === fieldKey)?.label}
                    height={viewMode === 'stack' ? chartHeight * 0.8 : chartHeight}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DataVisualization;