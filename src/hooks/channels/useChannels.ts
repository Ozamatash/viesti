"use client";

import { useState, useEffect } from "react";
import { Channel, GetChannelsResponse } from "~/types";

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await fetch("/api/channels");
      if (!res.ok) throw new Error('Failed to fetch channels');
      const { data }: GetChannelsResponse = await res.json();
      setChannels(data);
    } catch (error) {
      console.error("Error fetching channels:", error);
      setError("Failed to load channels. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchChannels();
  }, []);

  const addChannel = (channel: Channel) => {
    setChannels((prev) => [...prev, channel]);
  };

  return {
    channels,
    isLoading,
    error,
    fetchChannels,
    addChannel,
  };
} 