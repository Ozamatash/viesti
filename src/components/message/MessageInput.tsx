"use client";

import { ChangeEvent } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Paperclip, X, Loader2, Send } from "lucide-react";
import { cn } from "~/lib/utils";
import { useMessageInput } from "~/hooks/messages/useMessageInput";

interface MessageInputProps {
  channelId?: number;
  conversationId?: string;
  onMessageSent?: () => void;
}

export function MessageInput({ channelId, conversationId, onMessageSent }: MessageInputProps) {
  const {
    content,
    setContent,
    files,
    isUploading,
    isSending,
    fileInputRef,
    handleSubmit,
    handleFileChange,
    removeFile,
    openFileInput,
    isInputDisabled,
    isSubmitDisabled,
  } = useMessageInput({ channelId, conversationId, onMessageSent });

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background">
      {/* File preview */}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap px-4 pt-3">
          {files.map((file, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm",
                "bg-muted rounded-lg px-3 py-1.5",
                "animate-in fade-in-0 slide-in-from-bottom-2"
              )}
            >
              <span className="truncate max-w-[200px]">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-2 p-4">
        <div className="flex-1 relative">
          <Textarea
            value={content}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type a message..."
            className="resize-none pr-10 min-h-[44px] max-h-[200px] border-muted"
            disabled={isInputDisabled}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={openFileInput}
              disabled={isInputDisabled}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="min-w-[80px] h-[44px] gap-2 flex items-center justify-center px-4"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading
            </>
          ) : isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </div>
    </form>
  );
} 