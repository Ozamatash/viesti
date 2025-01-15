"use client";

import { useRef, useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useMessageSearch } from "~/hooks/messages/useMessageSearch";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { FileText, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { MessageHoverActions } from "./MessageHoverActions";
import { useUser } from "@clerk/nextjs";
import { ThreadPanel } from "./ThreadPanel";
import { useThread } from "~/hooks/messages/useThread";
import { 
  Message,
  isChannelMessage,
  AddReactionRequest,
  MessageListProps,
  MessageListScrollRef,
  MessageEventHandlers,
  MessageScrollHandlers
} from "~/types";

export function MessageList({ channelId, conversationId, messageId, isThread }: MessageListProps) {
  const { user } = useUser();
  const scrollRef = useRef<MessageListScrollRef>(null);
  const [threadOpen, setThreadOpen] = useState<number | null>(null);
  
  // Message search state
  const {
    messages,
    error,
    scrollToMessage,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useMessageSearch({ channelId, conversationId });

  const { thread } = useThread(messageId || 0);

  // Use thread messages if in thread mode
  const displayMessages = isThread && thread 
    ? [thread, ...thread.replies] 
    : messages;

  // Event handlers
  const eventHandlers: MessageEventHandlers = {
    onReactionAdd: async (messageId: number, emoji: string) => {
      if (!user) return;

      try {
        const endpoint = channelId
          ? `/api/channels/${channelId}/messages/${messageId}/reactions`
          : `/api/conversations/${conversationId}/messages/${messageId}/reactions`;

        const request: AddReactionRequest = { emoji };
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error("Failed to add reaction");
        }
      } catch (error) {
        console.error("Error adding reaction:", error);
      }
    },
    onThreadOpen: (messageId: number) => setThreadOpen(messageId),
  };

  // Scroll handlers
  const scrollHandlers: MessageScrollHandlers = {
    scrollToMessage,
    scrollToBottom: () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    },
    isNearBottom: (threshold = 100) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return false;
      return scrollEl.scrollHeight - scrollEl.scrollTop <= scrollEl.clientHeight + threshold;
    }
  };

  // Handle scrolling behavior
  useEffect(() => {
    if (!displayMessages.length || isLoadingMore) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const prevMessagesLength = scrollEl._prevMessagesLength || 0;
    scrollEl._prevMessagesLength = displayMessages.length;

    // If this is the initial load or we have new messages
    if (prevMessagesLength === 0 || displayMessages.length > prevMessagesLength) {
      // On initial load, always scroll to bottom
      if (prevMessagesLength === 0) {
        scrollHandlers.scrollToBottom();
      } else {
        // For new messages, only scroll if we're near the bottom
        if (scrollHandlers.isNearBottom()) {
          scrollHandlers.scrollToBottom();
        }
      }
    }
  }, [displayMessages.length, isLoadingMore]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Load More Button */}
          {!isThread && hasMore && (
            <div className="flex justify-center mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="w-32"
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}

          {displayMessages.map((message) => (
            <div
              id={`message-${message.id}`}
              key={message.id}
              className={cn(
                "group relative transition-colors px-4 py-3",
                "hover:bg-muted/50"
              )}
            >
              {!isThread && isChannelMessage(message) && (
                <MessageHoverActions
                  messageId={message.id}
                  onAddReaction={(emoji) => eventHandlers.onReactionAdd(message.id, emoji)}
                  onThreadClick={() => eventHandlers.onThreadOpen(message.id)}
                  replyCount={message._count?.replies || 0}
                />
              )}

              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.user.profileImageUrl ?? undefined} />
                  <AvatarFallback>{message.user.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{message.user.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="pl-10">
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Files */}
                {message.files && message.files.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md",
                          "bg-muted/50 hover:bg-muted",
                          "text-sm text-muted-foreground hover:text-foreground",
                          "transition-colors"
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{file.filename}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {message.reactions.map((reaction) => (
                      <div
                        key={reaction.id}
                        className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded text-sm",
                          "bg-muted/50 hover:bg-muted transition-colors",
                          "cursor-pointer"
                        )}
                        onClick={() => eventHandlers.onReactionAdd(message.id, reaction.emoji)}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-xs text-muted-foreground">
                          {reaction.user.username}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread Panel */}
      {threadOpen && (
        <ThreadPanel
          messageId={threadOpen}
          isOpen={true}
          onClose={() => setThreadOpen(null)}
        />
      )}
    </div>
  );
} 