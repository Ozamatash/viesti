"use client";

import { useState } from "react";
import { Smile, MessageSquare } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { MessageHoverActionsProps, EmojiPickerEvent } from "~/types";

export function MessageHoverActions({
  messageId,
  onAddReaction,
  onThreadClick,
  replyCount = 0,
}: MessageHoverActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm border rounded-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          onClick={onThreadClick}
        >
          <MessageSquare className="h-4 w-4" />
          {replyCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] flex items-center justify-center bg-primary text-primary-foreground rounded-full">
              {replyCount}
            </span>
          )}
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            side="top" 
            align="end"
            sideOffset={5}
          >
            <Picker
              data={data}
              onEmojiSelect={(emoji: EmojiPickerEvent) => {
                onAddReaction(emoji.native);
                setOpen(false);
              }}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
              searchPosition="none"
              navPosition="none"
              perLine={8}
              maxFrequentRows={1}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
} 