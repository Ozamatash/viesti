import { Channel } from "~/types";
import { ChannelRecap } from "./ChannelRecap";
import { Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface ChannelHeaderProps {
  channel: Channel;
}

export function ChannelHeader({ channel }: ChannelHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
      <div className="flex-1">
        <h1 className="text-lg font-semibold">#{channel.name}</h1>
        {channel.description && (
          <p className="text-sm text-muted-foreground">{channel.description}</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-purple-500 hover:text-purple-600 hover:bg-purple-50">
            <Sparkles className="h-5 w-5" />
            <span className="sr-only">AI features</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <ChannelRecap 
              channelId={channel.id.toString()} 
              channelName={channel.name} 
            />
          </DropdownMenuItem>
          {/* Add more channel actions here */}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 