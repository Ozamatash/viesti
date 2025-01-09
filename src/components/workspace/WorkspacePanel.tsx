"use client";

import { UserList } from "~/components/users/UserList";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { Users } from "lucide-react";
import { Button } from "~/components/ui/button";

export function WorkspacePanel() {
  return (
    <div className="flex h-full w-16 flex-col bg-muted/50 dark:bg-muted/80 border-r">
      {/* Workspace header - future logo placement */}
      <div className="flex h-16 items-center justify-center border-b bg-muted/30">
        {/* Logo will go here */}
      </div>

      {/* Navigation sections */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-1 py-2">
          {/* User list button */}
          <UserList variant="workspace-button" />

          {/* Future buttons can be added here */}
        </div>
      </ScrollArea>
    </div>
  );
} 