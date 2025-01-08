"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { uploadFile } from "~/lib/supabase-client";
import { useUser } from "@clerk/nextjs";

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
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* File preview */}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1"
            >
              <span className="text-sm truncate max-w-[200px]">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="w-full resize-none rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2 pr-24"
            rows={1}
            disabled={isSending || isUploading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-gray-700"
              disabled={isSending || isUploading}
            >
              📎
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={(!content.trim() && files.length === 0) || isSending || isUploading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
        >
          {isUploading ? "Uploading..." : isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
} 