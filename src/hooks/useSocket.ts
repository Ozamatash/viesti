"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from "@clerk/nextjs";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { userId } = useAuth();

  useEffect(() => {
    if (!socketRef.current && userId) {
      const socket = io({
        path: '/api/socket/io',
        addTrailingSlash: false,
        transports: ['websocket', 'polling'],
        auth: { userId },
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]);

  return socketRef.current;
}; 