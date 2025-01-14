"use client";

import { useState } from "react";
import { useMessages } from "./useMessages";
import { KeyedMutator } from "swr";
import { 
  Message, 
  MessageContextProps, 
  GetChannelMessagesResponse, 
  GetDirectMessagesResponse,
  MessageSearchState,
  MessageSearchResult,
} from "~/types";

type SearchProps = Omit<MessageContextProps, 'searchTerm'>;

interface SearchHookResult extends MessageSearchState {
  messages: Message[];
  error: string | null;
  mutate: KeyedMutator<any>;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
  scrollToMessage: (messageId: number) => void;
}

export function useMessageSearch({
  channelId,
  conversationId,
}: SearchProps): SearchHookResult {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  
  // Regular messages without search
  const { 
    messages, 
    isLoading, 
    error, 
    mutate,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useMessages({
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
      const response: GetChannelMessagesResponse | GetDirectMessagesResponse = await res.json();
      
      setSearchResults(response.data.data.map(message => ({
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        user: {
          username: message.user.username,
          profileImageUrl: message.user.profileImageUrl
        }
      })));
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
    hasMore,
    isLoadingMore,
    loadMore,
  };
} 