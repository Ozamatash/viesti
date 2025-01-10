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
  _count?: {
    replies: number;
  };
}

interface UseMessagesProps {
  channelId?: number;
  conversationId?: string;
}

export function useMessages({ channelId, conversationId }: UseMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchMessages = useCallback(async () => {
    try {
      setError(null);
      const endpoint = channelId 
        ? `/api/channels/${channelId}/messages`
        : `/api/conversations/${conversationId}/messages`;
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      
      // Handle both direct API response formats
      const messageArray = Array.isArray(data) ? data : data.messages || [];
      setMessages(messageArray.reverse());
      return true; // Indicate successful fetch
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [channelId, conversationId]);

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

    const joinRoom = () => {
      if (channelId) {
        console.log('Setting up socket listeners for channel:', channelId);
        socket.emit('join-channel', channelId.toString());
        console.log('Joined channel:', channelId);
      } else if (conversationId) {
        console.log('Setting up socket listeners for conversation:', conversationId);
        socket.emit('join-conversation', conversationId);
        console.log('Joined conversation:', conversationId);
      }
    };

    // Join room on initial connection and reconnects
    joinRoom();
    socket.on('connect', joinRoom);
    socket.on('reconnect', joinRoom);

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
    socket.on('new-dm-message', handleNewMessage);

    // Cleanup
    return () => {
      if (channelId) {
        console.log('Cleaning up socket listeners for channel:', channelId);
        socket.emit('leave-channel', channelId.toString());
      } else if (conversationId) {
        console.log('Cleaning up socket listeners for conversation:', conversationId);
        socket.emit('leave-conversation', conversationId);
      }
      socket.off('connect', joinRoom);
      socket.off('reconnect', joinRoom);
      socket.off('new-message', handleNewMessage);
      socket.off('new-dm-message', handleNewMessage);
    };
  }, [socket, channelId, conversationId]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
  };
} 