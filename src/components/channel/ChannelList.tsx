"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CreateChannelModal } from "./CreateChannelModal";
import { Button } from "~/components/ui/button";
import { Hash, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

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
      <div className="space-y-2 px-1">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-[2px]">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/channels/${channel.id}`}
            className={cn(
              "group flex flex-col gap-1 rounded-md px-2 py-2 text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              params?.channelId === channel.id.toString()
                ? "bg-accent/50"
                : "transparent"
            )}
          >
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{channel.name}</span>
            </div>
            {channel.description && (
              <div className="truncate pl-6 text-xs text-muted-foreground">
                {channel.description}
              </div>
            )}
            <div className="pl-6 text-xs text-muted-foreground/70">
              {channel._count?.members ?? 1} members
            </div>
          </Link>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "mt-2 w-full justify-start gap-2 text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Channel
        </Button>
      </div>

      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateChannel={handleCreateChannel}
      />
    </>
  );
} 