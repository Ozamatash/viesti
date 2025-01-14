"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { uploadFile } from "~/lib/supabase-client";
import { 
  SendMessageRequest, 
  MessageInputProps,
  MessageInputHookResult
} from "~/types";

interface UseMessageInputProps extends Pick<MessageInputProps, 'channelId' | 'conversationId' | 'onMessageSent'> {}

interface UploadedFile {
  url: string;
  filename: string;
  filetype: string;
}

export function useMessageInput({ channelId, conversationId, onMessageSent }: UseMessageInputProps): MessageInputHookResult {
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
      const uploadedFiles: UploadedFile[] = [];

      // Upload files if any
      if (files.length > 0) {
        setIsUploading(true);
        await Promise.all(
          files.map(async (file) => {
            const result = await uploadFile(file, user.id);
            uploadedFiles.push({
              url: result.url,
              filename: file.name,
              filetype: file.type
            });
          })
        );
        setIsUploading(false);
      }

      // Send message
      const endpoint = channelId 
        ? `/api/channels/${channelId}/messages`
        : `/api/conversations/${conversationId}/messages`;

      const request: SendMessageRequest = {
        content: content.trim(),
        files: uploadedFiles
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
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
    // State
    content,
    files,
    isUploading,
    isSending,
    isInputDisabled,
    isSubmitDisabled,
    // Handlers
    setContent,
    handleSubmit,
    handleFileChange,
    removeFile,
    openFileInput,
    // Refs
    fileInputRef,
  };
} 