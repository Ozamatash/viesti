"use client";

import { Hash } from "lucide-react";
import { IntelligentSearchDialog } from "~/components/search/IntelligentSearchDialog";
import { ChannelRecap } from "./ChannelRecap";

interface ChannelHeaderProps {
  channelId: number;
  name: string;
  description?: string | null;
}

export function ChannelHeader({ 
  channelId,
  name, 
  description,
}: ChannelHeaderProps) {
  const handleSearchSelect = (messageId: number) => {
    // TODO: Implement search selection handling
    console.log('Message selected:', messageId);
  };

  return (
    <div className="flex items-center gap-4 px-6 h-16 border-b">
      <div className="flex items-center gap-2 min-w-0">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <div className="truncate">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {name}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-4">
          <div className="w-[400px]">
            <IntelligentSearchDialog 
              channelId={channelId}
              onSelect={handleSearchSelect}
            />
          </div>
          <ChannelRecap 
            channelId={String(channelId)}
            channelName={name}
          />
        </div>
      </div>
    </div>
  );
} 