"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { uploadFile } from "~/lib/supabase-client";
import { useUser } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Paperclip, X, Loader2, Send } from "lucide-react";
import { cn } from "~/lib/utils";

interface MessageInputProps {
  channelId: number;
  onMessageSent?: () => void;
}

export function MessageInput({ channelId, onMessageSent }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && files.length === 0) || !user) return;
    if (isSending || isUploading) return;

    try {
      setIsSending(true);
      const fileUrls: string[] = [];

      // Upload files if any
      if (files.length > 0) {
        setIsUploading(true);
        await Promise.all(
          files.map(async (file) => {
            const result = await uploadFile(file, user.id);
            fileUrls.push(result.url);
          })
        );
        setIsUploading(false);
      }

      // Send message
      const res = await fetch(`/api/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          fileUrls,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      // Clear form
      setContent("");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onMessageSent?.();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* File preview */}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
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
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-2">
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
            className="resize-none pr-10 min-h-[44px] max-h-[200px]"
            disabled={isSending || isUploading}
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isUploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={(!content.trim() && files.length === 0) || isSending || isUploading}
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