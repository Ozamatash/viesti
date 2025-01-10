"use client";

import { useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useMessages } from "~/hooks/messages/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { MessageSquare, FileText, RefreshCcw } from "lucide-react";
import { cn } from "~/lib/utils";

interface MessageListProps {
  channelId?: number;
  conversationId?: string;
}

export function MessageList({ channelId, conversationId }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, error, fetchMessages } = useMessages({ channelId, conversationId });

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Scroll to bottom after messages load or new message arrives
  if (messages.length > 0) {
    setTimeout(scrollToBottom, 100);
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMessages()}
          className="gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-[calc(100vh-200px)] overflow-y-auto bg-background">
      <div className="space-y-[1px] divide-y divide-border">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "group transition-colors px-4 py-3",
              "hover:bg-muted/50"
            )}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={message.user.profileImageUrl ?? undefined} />
                <AvatarFallback>{message.user.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              {/* Message content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{message.user.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm leading-normal break-words">{message.content}</p>

                {/* Files */}
                {message.files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs",
                          "text-blue-500 hover:text-blue-700 hover:underline"
                        )}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {file.filename}
                      </a>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                {message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {message.reactions.map((reaction) => (
                      <div
                        key={reaction.id}
                        className={cn(
                          "inline-flex items-center gap-1 text-xs",
                          "bg-muted/50 hover:bg-muted",
                          "rounded-full px-2 py-0.5",
                          "transition-colors"
                        )}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-muted-foreground">{reaction.user.username}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thread indicator - only show for channel messages */}
                {channelId && message._count && message._count.replies > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {message._count.replies} replies
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 