// src/hooks/useSocket.js

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeData, setRealtimeData] = useState(null);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
      setIsConnected(true);
      toast.success('Real-time connection established', {
  toastId: 'socket-connected',
  autoClose: 2000,
});

    });

    socketRef.current.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  setIsConnected(false);

  // Ignore intentional disconnects (page change / unmount)
  if (reason === 'io client disconnect') return;

  toast.warning('Real-time connection lost', {
    toastId: 'socket-disconnected',
    autoClose: 2000,
  });
});


    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Listen for reactor data
    socketRef.current.on('reactor:data', (data) => {
      console.log('Received reactor data:', data);
      setRealtimeData(data);
    });

    // Listen for alerts
    socketRef.current.on('reactor:alert', (alert) => {
      console.log('Received alert:', alert);
      setRealtimeAlerts((prev) => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
      
      // Show toast notification
      const severity = alert.severity || 'warning';
      const toastMethod = severity === 'critical' ? toast.error : 
                         severity === 'warning' ? toast.warning : toast.info;
      toastMethod(`Alert: ${alert.message}`, { autoClose: 5000 });
    });

    // Listen for admin alerts
    socketRef.current.on('admin:alert', (alert) => {
      console.log('Received admin alert:', alert);
      setRealtimeAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    // Listen for system messages
    socketRef.current.on('system:message', (message) => {
      console.log('System message:', message);
      toast.info(message.message);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token]);

  // Subscribe to reactor
  const subscribeToReactor = (reactorId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe:reactor', reactorId);
      console.log('Subscribed to reactor:', reactorId);
    }
  };

  // Unsubscribe from reactor
  const unsubscribeFromReactor = (reactorId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('unsubscribe:reactor', reactorId);
      console.log('Unsubscribed from reactor:', reactorId);
    }
  };

  // Get active subscriptions
  const getSubscriptions = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('get:subscriptions');
    }
  };

  // Clear realtime alerts
  const clearRealtimeAlerts = () => {
    setRealtimeAlerts([]);
  };

  return {
    socket: socketRef.current,
    isConnected,
    realtimeData,
    realtimeAlerts,
    subscribeToReactor,
    unsubscribeFromReactor,
    getSubscriptions,
    clearRealtimeAlerts,
  };
};