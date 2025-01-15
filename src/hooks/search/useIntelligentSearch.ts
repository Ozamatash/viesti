"use client";

import { useState, useCallback, useEffect } from "react";
import { useDebounce } from "~/hooks/useDebounce";
import { MessageSearchResult, SearchResponse } from "~/types";

interface UseIntelligentSearchProps {
  channelId?: number;
  conversationId?: string;
}

interface UseIntelligentSearchResult {
  query: string;
  results: MessageSearchResult[];
  isSearching: boolean;
  searchMode: "semantic" | "keyword";
  setQuery: (query: string) => void;
  setSearchMode: (mode: "semantic" | "keyword") => void;
  handleSearch: (value: string) => Promise<void>;
}

export function useIntelligentSearch({
  channelId,
  conversationId,
}: UseIntelligentSearchProps = {}): UseIntelligentSearchResult {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"semantic" | "keyword">("semantic");

  const debouncedQuery = useDebounce(query, 1000);

  const handleSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const searchParams = new URLSearchParams({
        q: value,
        mode: searchMode,
        ...(channelId && { channelId: channelId.toString() }),
        ...(conversationId && { conversationId }),
      });

      const response = await fetch(`/api/search?${searchParams}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json() as SearchResponse;
      setResults(data.data.results);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [channelId, conversationId, searchMode]);

  // Trigger search when debounced query changes
  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery, handleSearch]);

  return {
    query,
    results,
    isSearching,
    searchMode,
    setQuery,
    setSearchMode,
    handleSearch,
  };
} 