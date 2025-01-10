"use client";

import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { MessageInput } from "./MessageInput";
import { useThread } from "~/hooks/messages/useThread";
import { MessageList } from "./MessageList";
import { cn } from "~/lib/utils";

interface ThreadPanelProps {
  messageId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadPanel({
  messageId,
  isOpen,
  onClose,
}: ThreadPanelProps) {
  const { thread, isLoading, error, addReply } = useThread(messageId);

  const handleSendReply = async (content: string) => {
    try {
      await addReply(content);
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
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
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-lg font-semibold">Thread</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden bg-white">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading thread...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-destructive">
              {error}
            </div>
          ) : thread ? (
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