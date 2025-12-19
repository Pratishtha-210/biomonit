// src/pages/Login.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import useAuthStore from '../store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { login, isLoggingIn } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent page refresh
    
    console.log('Login attempt with:', { username: formData.username });
    
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    try {
      setError(''); // Clear previous errors
      await login(formData);
      // Navigation handled by useAuth hook
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
          }}
        >
          {/* Logo and Title */}
          <Box textAlign="center" mb={3}>
            <ScienceIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Bio-Monitor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time Bioreactor Monitoring System
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              margin="normal"
              autoComplete="username"
              autoFocus
              disabled={isLoggingIn}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              autoComplete="current-password"
              disabled={isLoggingIn}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoggingIn}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </Button>
          </form>

        </Paper>

        {/* Footer */}
        <Box textAlign="center" mt={3}>
          <Typography variant="body2" sx={{ color: 'white' }}>
            © 2024 Bio-Monitor. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;