"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { UserStatus } from "~/types";
import { IntelligentSearchDialog } from "~/components/search/IntelligentSearchDialog";
import { DMRecap } from "./DMRecap";
import { useMessageSearch } from "~/hooks/messages/useMessageSearch";

interface DMHeaderProps {
  conversationId: string;
  user: {
    id: string;
    username: string;
    profileImageUrl: string | null;
    status: UserStatus;
  };
}

export function DMHeader({ conversationId, user }: DMHeaderProps) {
  const { scrollToMessage } = useMessageSearch({ conversationId });

  const handleSearchSelect = (messageId: number) => {
    scrollToMessage(messageId);
  };

  return (
    <div className="border-b p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.profileImageUrl ?? undefined} />
              <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span 
              className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                user.status === UserStatus.Online ? "bg-green-500" : "bg-muted"
              )}
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{user.username}</h1>
            <p className={cn(
              "text-sm",
              user.status === UserStatus.Online 
                ? "text-green-600" 
                : "text-muted-foreground"
            )}>
              {user.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-[400px]">
            <IntelligentSearchDialog 
              conversationId={conversationId}
              onSelect={handleSearchSelect}
            />
          </div>
          <DMRecap 
            conversationId={conversationId} 
            participantName={user.username} 
          />
        </div>
      </div>
    </div>
  );
} 