"use client";

import { useState, useCallback, useEffect } from "react";
import { useSocket } from "../useSocket";

interface Message {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    profileImageUrl: string | null;
  };
  files: {
    id: number;
    url: string;
    filename: string;
    filetype: string;
  }[];
  reactions: {
    id: number;
    emoji: string;
    user: {
      id: string;
      username: string;
    };
  }[];
  _count: {
    replies: number;
  };
}

export function useMessages(channelId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchMessages = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/channels/${channelId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data.reverse());
      return true; // Indicate successful fetch
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Socket.IO setup
  useEffect(() => {
    if (!socket) {
      console.log('No socket connection');
      return;
    }

    console.log('Setting up socket listeners for channel:', channelId);

    // Join channel room
    socket.emit('join-channel', channelId.toString());
    console.log('Joined channel:', channelId);

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      console.log('Received new message:', message);
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        // Add new message at the end
        return [...prev, message];
      });
    };

    socket.on('new-message', handleNewMessage);

    // Cleanup
    return () => {
      console.log('Cleaning up socket listeners for channel:', channelId);
      socket.emit('leave-channel', channelId.toString());
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, channelId]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
  };
} 