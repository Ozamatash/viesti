"use client";

import { useState } from "react";
import { useMessages } from "./useMessages";

interface UseMessageSearchProps {
  channelId?: number;
  conversationId?: string;
}

export function useMessageSearch({
  channelId,
  conversationId,
}: UseMessageSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Regular messages without search
  const { messages, isLoading, error, mutate } = useMessages({
    channelId,
    conversationId,
  });

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const endpoint = channelId 
        ? `/api/channels/${channelId}/messages`
        : `/api/conversations/${conversationId}/messages`;
      
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('search', value);
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to search messages');
      const data = await res.json();
      
      setSearchResults(Array.isArray(data) ? data : data.messages || []);
    } catch (error) {
      console.error("Error searching messages:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const scrollToMessage = (messageId: number) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message temporarily
      messageElement.classList.add('bg-muted');
      setTimeout(() => {
        messageElement.classList.remove('bg-muted');
      }, 2000);
    }
  };

  return {
    messages,
    searchResults,
    isSearching,
    error,
    searchTerm,
    handleSearch,
    scrollToMessage,
    mutate,
  };
} 