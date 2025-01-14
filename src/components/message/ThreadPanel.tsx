"use client";

import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { MessageInput } from "./MessageInput";
import { useThread } from "~/hooks/messages/useThread";
import { MessageList } from "./MessageList";
import { cn } from "~/lib/utils";
import { 
  ThreadPanelProps, 
  ThreadState, 
  ThreadHandlers,
  ThreadError 
} from "~/types";
import { ThreadRecap } from "~/components/thread/ThreadRecap";

export function ThreadPanel({
  messageId,
  isOpen,
  onClose,
}: ThreadPanelProps) {
  const { 
    // Thread state
    thread, 
    isLoading, 
    error,
    // Thread handlers
    addReply 
  } = useThread(messageId);

  const handleSendReply: ThreadHandlers['handleSendReply'] = async (request) => {
    try {
      await addReply(request.content);
    } catch (err) {
      const error = err as ThreadError;
      console.error("Failed to send reply:", {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details
      });
    }
  };

  const threadState: ThreadState = {
    thread,
    isLoading,
    error
  };

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-[400px] bg-white border-l shadow-lg z-50",
        "transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex flex-col p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Thread</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {thread && (
            <ThreadRecap 
              threadId={String(thread.id)} 
              messageCount={thread.replies.length + 1} 
            />
          )}
        </div>

        <div className="flex-1 overflow-hidden bg-white">
          {threadState.isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading thread...
            </div>
          ) : threadState.error ? (
            <div className="p-4 text-center text-destructive">
              {threadState.error}
            </div>
          ) : threadState.thread ? (
            <MessageList messageId={messageId} isThread />
          ) : null}
        </div>

        <div className="p-4 border-t bg-white">
          <MessageInput 
            isThread 
            onSend={handleSendReply}
            onMessageSent={() => {
              // Optionally handle message sent callback
            }}
          />
        </div>
      </div>
    </div>
  );
} 