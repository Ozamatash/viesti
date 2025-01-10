"use client";

import { useRef, useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useMessageSearch } from "~/hooks/messages/useMessageSearch";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { FileText, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { SearchInput } from "~/components/ui/search-input";
import { MessageHoverActions } from "./MessageHoverActions";
import { useUser } from "@clerk/nextjs";
import { ThreadPanel } from "./ThreadPanel";
import { useThread } from "~/hooks/messages/useThread";

interface MessageListProps {
  channelId?: number;
  conversationId?: string;
  messageId?: number;  // For thread messages
  isThread?: boolean;
}

export function MessageList({ channelId, conversationId, messageId, isThread }: MessageListProps) {
  const { user } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [threadOpen, setThreadOpen] = useState<number | null>(null);
  const {
    messages,
    searchResults,
    isSearching,
    error,
    handleSearch,
    searchTerm,
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

  const handleAddReaction = async (messageId: number, emoji: string) => {
    if (!user) return;

    try {
      const endpoint = channelId
        ? `/api/channels/${channelId}/messages/${messageId}/reactions`
        : `/api/conversations/${conversationId}/messages/${messageId}/reactions`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) {
        throw new Error("Failed to add reaction");
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Handle scrolling behavior
  useEffect(() => {
    if (!displayMessages.length || searchTerm || isLoadingMore) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // Get the previous messages length from a ref to detect new messages
    const prevMessagesLength = (scrollEl as any)._prevMessagesLength || 0;
    (scrollEl as any)._prevMessagesLength = displayMessages.length;

    // If this is the initial load or we have new messages
    if (prevMessagesLength === 0 || displayMessages.length > prevMessagesLength) {
      // On initial load, always scroll to bottom
      if (prevMessagesLength === 0) {
        scrollToBottom();
      } else {
        // For new messages, only scroll if we're near the bottom
        const isAtBottom = scrollEl.scrollHeight - scrollEl.scrollTop <= scrollEl.clientHeight + 100;
        if (isAtBottom) {
          scrollToBottom();
        }
      }
    }
  }, [displayMessages.length, searchTerm, isLoadingMore]);

  const handleThreadClick = (messageId: number) => {
    setThreadOpen(messageId);
  };

  return (
    <div className="flex flex-col h-full">
      {!isThread && (
        <div className="flex-shrink-0 p-4 border-b relative">
          <SearchInput
            placeholder="Search messages..."
            onSearch={handleSearch}
          />
          
          {/* Search Results Dropdown */}
          {searchTerm && (
            <div className="absolute left-0 right-0 top-full mt-1 mx-4 bg-white border rounded-md shadow-lg z-10 max-h-[300px] overflow-y-auto divide-y divide-border">
              {isSearching ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No messages found
                </div>
              ) : (
                searchResults.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => {
                      scrollToMessage(message.id);
                      handleSearch(""); // Clear search after clicking
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3",
                      "hover:bg-muted focus:bg-muted",
                      "focus:outline-none transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={message.user.profileImageUrl ?? undefined} />
                        <AvatarFallback>{message.user.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{message.user.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{message.content}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

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
              {!isThread && (
                <MessageHoverActions
                  messageId={message.id}
                  onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                  onThreadClick={() => handleThreadClick(message.id)}
                  replyCount={message._count?.replies || 0}
                />
              )}

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
                        <button
                          key={reaction.id}
                          onClick={() => handleAddReaction(message.id, reaction.emoji)}
                          className={cn(
                            "inline-flex items-center gap-1 text-xs",
                            "bg-muted/50 hover:bg-muted",
                            "rounded-full px-2 py-0.5",
                            "transition-colors",
                            "cursor-pointer"
                          )}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-muted-foreground">{reaction.user.username}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Thread Indicator */}
                  {!isThread && (message._count?.replies ?? 0) > 0 && (
                    <div className="mt-1.5 -ml-2">
                      <Button
                        onClick={() => handleThreadClick(message.id)}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {message._count?.replies} {(message._count?.replies ?? 0) === 1 ? 'reply' : 'replies'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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