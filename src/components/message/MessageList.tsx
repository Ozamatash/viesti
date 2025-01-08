"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSocket } from "~/hooks/useSocket";
import { MessageInput } from "./MessageInput";

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

interface MessageListProps {
  channelId: number;
}

export function MessageList({ channelId }: MessageListProps) {
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
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again.");
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
        // Add new message at the beginning
        return [message, ...prev];
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/4 mt-2" />
        </div>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-2/4" />
          <div className="h-4 bg-gray-200 rounded w-1/4 mt-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        {error}
        <button
          onClick={fetchMessages}
          className="block mx-auto mt-2 text-blue-500 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="group hover:bg-gray-50 p-2 -mx-2 rounded">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0">
              {message.user.profileImageUrl && (
                <img
                  src={message.user.profileImageUrl}
                  alt={message.user.username}
                  className="w-full h-full rounded-full"
                />
              )}
            </div>

            {/* Message content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{message.user.username}</span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-gray-900 break-words">{message.content}</p>

              {/* Files */}
              {message.files.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.files.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-500 hover:underline"
                    >
                      {file.filename}
                    </a>
                  ))}
                </div>
              )}

              {/* Reactions */}
              {message.reactions.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {message.reactions.map((reaction) => (
                    <div
                      key={reaction.id}
                      className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm"
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-gray-600">{reaction.user.username}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Thread indicator */}
              {message._count.replies > 0 && (
                <button className="mt-2 text-sm text-blue-500 hover:underline">
                  {message._count.replies} replies
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 