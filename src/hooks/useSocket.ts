"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from "@clerk/nextjs";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const { userId } = useAuth();

  useEffect(() => {
    const initSocket = () => {
      if (!userId) return null;

      const socket = io({
        path: '/api/socket/io',
        addTrailingSlash: false,
        transports: ['websocket', 'polling'],
        auth: { userId },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      socket.on('connect', () => {
        console.log('Socket connected');
        reconnectAttemptRef.current = 0;
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try reconnecting
          socket.connect();
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt:', attemptNumber);
        reconnectAttemptRef.current = attemptNumber;
      });

      socket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        // Try to reconnect on general errors
        if (!socket.connected) {
          socket.connect();
        }
      });

      return socket;
    };

    // Initialize socket
    if (!socketRef.current) {
      socketRef.current = initSocket();
    }

    // Handle browser visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, checking connection');
        if (socketRef.current && !socketRef.current.connected) {
          console.log('Reconnecting socket after visibility change');
          socketRef.current.connect();
        }
      }
    };

    // Handle browser online/offline events
    const handleOnline = () => {
      console.log('Browser went online');
      if (socketRef.current && !socketRef.current.connected) {
        console.log('Reconnecting socket after coming online');
        socketRef.current.connect();
      }
    };

    const handleOffline = () => {
      console.log('Browser went offline');
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // Cleanup socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]);

  return socketRef.current;
}; 