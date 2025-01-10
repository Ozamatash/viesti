import { useState, useEffect } from "react";
import { useSocket } from "~/hooks/useSocket";

interface User {
  id: string;
  username: string;
  profileImageUrl: string | null;
}

interface File {
  id: number;
  url: string;
  filename: string;
  filetype: string;
}

interface Reaction {
  id: number;
  emoji: string;
  user: {
    id: string;
    username: string;
  };
}

interface Message {
  id: number;
  content: string;
  createdAt: string;
  channelId: number;
  user: User;
  files: File[];
  reactions: Reaction[];
  _count?: {
    replies: number;
  };
}

interface Thread extends Message {
  replies: Message[];
}

export function useThread(messageId: number) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();
  const [channelId, setChannelId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchThread = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/messages/${messageId}/thread`);
        if (!response.ok) {
          throw new Error("Failed to fetch thread");
        }
        const data = await response.json();
        
        if (mounted) {
          setThread(data);
          setChannelId(data.channelId);
          
          // Join the thread's channel
          if (socket && data.channelId) {
            socket.emit("join-channel", data.channelId.toString());
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (messageId) {
      fetchThread();
    }

    return () => {
      mounted = false;
    };
  }, [messageId, socket]);

  useEffect(() => {
    if (!socket || !channelId) return;

    const handleThreadReply = (data: { messageId: number; reply: Message }) => {
      if (data.messageId === messageId) {
        setThread((prev) => {
          if (!prev) return prev;
          const replyExists = prev.replies.some(reply => reply.id === data.reply.id);
          if (replyExists) return prev;
          return {
            ...prev,
            replies: [...prev.replies, data.reply],
          };
        });
      }
    };

    // Set up socket listeners
    socket.on("thread-reply", handleThreadReply);

    // Join channel
    socket.emit("join-channel", channelId.toString());

    // Cleanup function
    return () => {
      socket.off("thread-reply", handleThreadReply);
      socket.emit("leave-channel", channelId.toString());
    };
  }, [socket, channelId, messageId]);

  const addReply = async (content: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/thread`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to add reply");
      }

      const reply = await response.json();
      
      // Optimistically update the UI
      setThread((prev) => {
        if (!prev) return prev;
        const replyExists = prev.replies.some(r => r.id === reply.id);
        if (replyExists) return prev;
        return {
          ...prev,
          replies: [...prev.replies, reply],
        };
      });

      return reply;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reply");
      throw err;
    }
  };

  return {
    thread,
    isLoading,
    error,
    addReply,
  };
} 