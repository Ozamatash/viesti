"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR, { KeyedMutator } from "swr";
import { useSocket } from "../useSocket";
import { 
  Message,
  Reaction,
  SocketEventName,
  ReactionEvent,
  GetChannelMessagesResponse,
  GetDirectMessagesResponse,
  MessageContextProps
} from "~/types";

interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

interface MessagesHookResult {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  mutate: KeyedMutator<MessagesResponse>;
}

const fetcher = async (url: string): Promise<MessagesResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch messages');
  const response: GetChannelMessagesResponse | GetDirectMessagesResponse = await res.json();
  const messages = [...response.data.data].reverse() as Message[];
  return {
    messages,
    hasMore: response.data.hasMore,
  };
};

export function useMessages({ channelId, conversationId, searchTerm }: MessageContextProps): MessagesHookResult {
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

  const { data, error, mutate } = useSWR(getKey, fetcher, {
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
        socket.emit(SocketEventName.JoinChannel, channelId);
        console.log('Joined channel:', channelId);
      } else if (conversationId) {
        console.log('Setting up socket listeners for conversation:', conversationId);
        socket.emit(SocketEventName.JoinConversation, conversationId);
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
    const handleReaction = (event: ReactionEvent) => {
      console.log('Received reaction:', event);
      setAllMessages(currentMessages => {
        if (!currentMessages) return currentMessages;

        return currentMessages.map(msg => {
          if (msg.id !== event.messageId) return msg;

          if ('removed' in event.reaction) {
            return {
              ...msg,
              reactions: msg.reactions.filter(r => r.id !== event.reaction.id),
            };
          }

          const existingReactionIndex = msg.reactions.findIndex(r => r.id === event.reaction.id);
          if (existingReactionIndex !== -1) {
            // Update existing reaction
            const updatedReactions = [...msg.reactions];
            updatedReactions[existingReactionIndex] = event.reaction as Reaction;
            return {
              ...msg,
              reactions: updatedReactions,
            };
          }

          // Add new reaction
          return {
            ...msg,
            reactions: [...msg.reactions, event.reaction as Reaction],
          };
        });
      });
    };

    socket.on(SocketEventName.NewMessage, handleNewMessage);
    socket.on(SocketEventName.NewDirectMessage, handleNewMessage);
    socket.on(SocketEventName.ReactionAdded, handleReaction);

    // Cleanup
    return () => {
      if (channelId) {
        console.log('Cleaning up socket listeners for channel:', channelId);
        socket.emit(SocketEventName.LeaveChannel, channelId);
      } else if (conversationId) {
        console.log('Cleaning up socket listeners for conversation:', conversationId);
        socket.emit(SocketEventName.LeaveConversation, conversationId);
      }
      socket.off('connect', joinRoom);
      socket.off('reconnect', joinRoom);
      socket.off(SocketEventName.NewMessage, handleNewMessage);
      socket.off(SocketEventName.NewDirectMessage, handleNewMessage);
      socket.off(SocketEventName.ReactionAdded, handleReaction);
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