"use client";

import { useState } from "react";
import { Search, Loader2, MessageSquare, Calendar, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { useIntelligentSearch } from "~/hooks/search/useIntelligentSearch";
import { MessageSearchResult } from "~/types";

interface IntelligentSearchDialogProps {
  onSelect: (messageId: number) => void;
  channelId?: number;
  conversationId?: string;
}

export function IntelligentSearchDialog({ 
  onSelect,
  channelId,
  conversationId 
}: IntelligentSearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    query,
    answer,
    results,
    isSearching,
    searchMode,
    setQuery,
    setSearchMode,
  } = useIntelligentSearch({ channelId, conversationId });

  const handleSelect = (result: MessageSearchResult) => {
    onSelect(result.id);
    setIsOpen(false);
  };

  const toggleSearchMode = () => {
    setSearchMode(searchMode === "semantic" ? "keyword" : "semantic");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground"
        >
          <Search className="mr-2 h-4 w-4" />
          Search messages...
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Search Messages</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder={searchMode === "semantic" ? "Ask a question or describe what you're looking for..." : "Search keywords..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={toggleSearchMode}
              className="gap-2"
            >
              {searchMode === "semantic" ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Semantic
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Keyword
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            {isSearching ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Search className="h-12 w-12 mb-4" />
                {query ? "No results found" : "Start typing to search"}
              </div>
            ) : (
              <div className="space-y-4">
                {searchMode === "semantic" && answer && (
                  <div className="mb-6 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      AI Answer
                    </div>
                    <p className="text-sm">{answer}</p>
                  </div>
                )}

                <div className="space-y-2">
                  {results.length > 0 && (
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      {results.length} {results.length === 1 ? 'result' : 'results'} found
                    </div>
                  )}
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg",
                        "hover:bg-muted/50 focus:bg-muted/50",
                        "focus:outline-none transition-colors"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={result.user.profileImageUrl ?? undefined} />
                          <AvatarFallback>{result.user.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{result.user.username}</span>
                            {result.channel && (
                              <span className="text-sm text-muted-foreground">
                                in #{result.channel.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                            {result.thread && (
                              <>
                                <MessageSquare className="h-3 w-3 ml-2" />
                                {result.thread.messageCount} replies
                              </>
                            )}
                          </div>
                        </div>
                        {result.relevanceScore && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(result.relevanceScore * 100)}% match
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.content}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
} 