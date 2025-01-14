import { useState, useEffect } from "react";
import { useSocket } from "~/hooks/useSocket";
import { 
  Thread, 
  SocketEventName,
  ThreadReplyEvent,
  SendMessageRequest,
  GetThreadResponse,
  ThreadError,
  ThreadHookResult
} from "~/types";

export function useThread(messageId: number): ThreadHookResult {
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
        const { data }: GetThreadResponse = await response.json();
        
        if (mounted) {
          setThread(data);
          setChannelId(data.channelId);
          
          // Join the thread's channel
          if (socket && data.channelId) {
            socket.emit(SocketEventName.JoinChannel, data.channelId);
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
      // Leave the channel when unmounting
      if (socket && channelId) {
        socket.emit(SocketEventName.LeaveChannel, channelId);
      }
    };
  }, [messageId, socket, channelId]);

  // Listen for new replies
  useEffect(() => {
    if (!socket || !thread) return;

    const handleNewReply = (event: ThreadReplyEvent) => {
      if (event.messageId !== thread.id) return;

      setThread(currentThread => {
        if (!currentThread) return currentThread;
        return {
          ...currentThread,
          replies: [...currentThread.replies, event.reply]
        };
      });
    };

    socket.on(SocketEventName.ThreadReply, handleNewReply);

    return () => {
      socket.off(SocketEventName.ThreadReply, handleNewReply);
    };
  }, [socket, thread]);

  const addReply = async (content: string) => {
    if (!thread) return;

    try {
      const request: SendMessageRequest = {
        content
      };

      const response = await fetch(`/api/messages/${thread.id}/thread`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error("Failed to add reply");
      }

      const { data } = await response.json();
      setThread(currentThread => {
        if (!currentThread) return currentThread;
        return {
          ...currentThread,
          replies: [...currentThread.replies, data]
        };
      });
    } catch (err) {
      console.error("Error adding reply:", err);
      throw err;
    }
  };

  const handleSendReply = async (request: SendMessageRequest) => {
    if (!thread) return;

    try {
      const response = await fetch(`/api/messages/${thread.id}/thread`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error: ThreadError = new Error("Failed to send reply");
        error.statusCode = response.status;
        throw error;
      }

      const { data } = await response.json();
      setThread(currentThread => {
        if (!currentThread) return currentThread;
        return {
          ...currentThread,
          replies: [...currentThread.replies, data]
        };
      });
    } catch (err) {
      console.error("Error sending reply:", err);
      throw err;
    }
  };

  return {
    thread,
    isLoading,
    error,
    addReply,
    handleSendReply
  };
} 