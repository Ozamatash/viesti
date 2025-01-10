"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
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

interface Reaction {
  id: number;
  emoji: string;
  user: {
    id: string;
    username: string;
  };
  removed?: boolean;
}

interface UseMessagesProps {
  channelId?: number;
  conversationId?: string;
  searchTerm?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch messages');
  const data = await res.json();
  return Array.isArray(data) ? data.reverse() : (data.messages || []).reverse();
};

export function useMessages({ channelId, conversationId, searchTerm }: UseMessagesProps) {
  const socket = useSocket();

  // Create the key for SWR
  const getKey = useCallback(() => {
    if (!channelId && !conversationId) return null;
    
    const endpoint = channelId 
      ? `/api/channels/${channelId}/messages`
      : `/api/conversations/${conversationId}/messages`;
    
    const url = new URL(endpoint, window.location.origin);
    if (searchTerm) {
      url.searchParams.set('search', searchTerm);
    }
    
    return url.toString();
  }, [channelId, conversationId, searchTerm]);

  const { data: messages, error, mutate } = useSWR<Message[]>(getKey, fetcher, {
    revalidateOnFocus: false, // Don't revalidate on tab focus
  });

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
      mutate(currentMessages => {
        if (!currentMessages) return [message];
        if (currentMessages.some(m => m.id === message.id)) return currentMessages;
        return [...currentMessages, message];
      }, false);
    };

    // Listen for reactions
    const handleReaction = ({ messageId, reaction }: { messageId: number; reaction: Reaction }) => {
      console.log('Received reaction:', { messageId, reaction });
      mutate(currentMessages => {
        if (!currentMessages) return currentMessages;

        return currentMessages.map(msg => {
          if (msg.id !== messageId) return msg;

          if (reaction.removed) {
            return {
              ...msg,
              reactions: msg.reactions.filter(r => r.id !== reaction.id),
            };
          }

          const existingReactionIndex = msg.reactions.findIndex(r => r.id === reaction.id);
          if (existingReactionIndex !== -1) {
            // Update existing reaction
            const updatedReactions = [...msg.reactions];
            updatedReactions[existingReactionIndex] = reaction;
            return {
              ...msg,
              reactions: updatedReactions,
            };
          }

          // Add new reaction
          return {
            ...msg,
            reactions: [...msg.reactions, reaction],
          };
        });
      }, false).catch(console.error);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('new-dm-message', handleNewMessage);
    socket.on('reaction-added', handleReaction);

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
      socket.off('reaction-added', handleReaction);
    };
  }, [socket, channelId, conversationId, mutate]);

  return {
    messages: messages || [],
    isLoading: !error && !messages,
    error: error?.message || null,
    mutate,
  };
} 