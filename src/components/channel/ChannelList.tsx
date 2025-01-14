"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CreateChannelModal } from "./CreateChannelModal";
import { Button } from "~/components/ui/button";
import { Hash, Plus, RefreshCcw } from "lucide-react";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";
import { useChannels } from "~/hooks/channels/useChannels";
import { Channel } from "~/types";

export function ChannelList() {
  const params = useParams();
  const { channels, isLoading, error, fetchChannels, addChannel } = useChannels();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2 p-3 border-b">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center border-b">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchChannels()}
          className="gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  const handleCreateChannel = (channel: Channel) => {
    addChannel(channel);
  };

  return (
    <>
      <div className="border-b">
        <div className="px-3 py-2 border-b bg-muted/30">
          <h2 className="font-semibold text-sm text-muted-foreground">Channels</h2>
        </div>
        <div className="divide-y divide-border/30">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/channels/${channel.id}`}
              className={cn(
                "group flex flex-col gap-1 px-3 py-2 text-sm transition-colors",
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
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 text-muted-foreground p-3 rounded-none border-t",
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