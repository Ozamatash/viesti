"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { uploadFile } from "~/lib/supabase-client";

interface UseMessageInputProps {
  channelId?: number;
  conversationId?: string;
  onMessageSent?: () => void;
}

export function useMessageInput({ channelId, conversationId, onMessageSent }: UseMessageInputProps) {
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
      const endpoint = channelId 
        ? `/api/channels/${channelId}/messages`
        : `/api/conversations/${conversationId}/messages`;

      const res = await fetch(endpoint, {
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

  const removeFile = (index: number) => {
    setFiles(files => files.filter((_, i) => i !== index));
  };

  const openFileInput = () => {
    fileInputRef.current?.click();
  };

  const isInputDisabled = isSending || isUploading;
  const isSubmitDisabled = (!content.trim() && files.length === 0) || isSending || isUploading;

  return {
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
  };
} 