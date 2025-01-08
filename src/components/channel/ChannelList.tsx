"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CreateChannelModal } from "./CreateChannelModal";

interface Channel {
  id: number;
  name: string;
  description: string | null;
  _count: {
    members: number;
  };
}

export function ChannelList() {
  const params = useParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch channels on component mount
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      setChannels(data);
    } catch (error) {
      console.error("Error fetching channels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChannel = (channel: Channel) => {
    setChannels((prev) => [...prev, channel]);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-10 bg-gray-700 animate-pulse rounded" />
        <div className="h-10 bg-gray-700 animate-pulse rounded" />
        <div className="h-10 bg-gray-700 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/channels/${channel.id}`}
            className={`block p-2 rounded hover:bg-gray-700 transition-colors ${
              params?.channelId === channel.id.toString()
                ? "bg-gray-700"
                : "bg-transparent"
            }`}
          >
            <div className="font-medium">#{channel.name}</div>
            {channel.description && (
              <div className="text-sm text-gray-400 truncate">
                {channel.description}
              </div>
            )}
            <div className="text-xs text-gray-500">
              {channel._count?.members ?? 1} members
            </div>
          </Link>
        ))}

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full mt-4 p-2 text-left text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          + Create Channel
        </button>
      </div>

      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateChannel={handleCreateChannel}
      />
    </>
  );
} 