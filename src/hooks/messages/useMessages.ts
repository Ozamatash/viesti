"use client";

import { useCallback, useEffect, useState } from "react";
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

interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch messages');
  const data = await res.json();
  return {
    messages: data.messages.reverse(),
    hasMore: data.hasMore,
  };
};

export function useMessages({ channelId, conversationId, searchTerm }: UseMessagesProps) {
  const socket = useSocket();
  const [skip, setSkip] = useState(0);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
    url.searchParams.set('skip', skip.toString());
    
    return url.toString();
  }, [channelId, conversationId, searchTerm, skip]);

  const { data, error, mutate } = useSWR<MessagesResponse>(getKey, fetcher, {
    revalidateOnFocus: false,
  });

  // Update allMessages when data changes
  useEffect(() => {
    if (data) {
      if (skip === 0) {
        setAllMessages(data.messages);
      } else {
        setAllMessages(prev => [...data.messages, ...prev]);
      }
      setHasMore(data.hasMore);
    }
  }, [data, skip]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setSkip(prev => prev + 50);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore]);

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
      setAllMessages(currentMessages => {
        if (!currentMessages) return [message];
        if (currentMessages.some(m => m.id === message.id)) return currentMessages;
        return [...currentMessages, message];
      });
    };

    // Listen for reactions
    const handleReaction = ({ messageId, reaction }: { messageId: number; reaction: Reaction }) => {
      console.log('Received reaction:', { messageId, reaction });
      setAllMessages(currentMessages => {
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
      });
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
  }, [socket, channelId, conversationId]);

  return {
    messages: allMessages || [],
    isLoading: !error && !data,
    isLoadingMore,
    error: error?.message || null,
    hasMore,
    loadMore,
    mutate,
  };
} 