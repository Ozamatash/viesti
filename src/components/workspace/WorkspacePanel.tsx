"use client";

import { UserList } from "~/components/users/UserList";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { Users, Hash } from "lucide-react";
import { Button } from "~/components/ui/button";
import { UserProfile, UserButton } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";

export function WorkspacePanel() {
  const router = useRouter();
  const pathname = usePathname();
  const isChannelsPage = pathname?.startsWith("/channels");

  return (
    <div className="flex h-full w-16 flex-col bg-muted/50 dark:bg-muted/80 border-r">
      {/* Workspace header - future logo placement */}
      <div className="flex h-16 items-center justify-center border-b bg-muted/30">
        {/* Logo will go here */}
      </div>

      {/* Navigation sections */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-1 py-2">
          {/* Channels button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-11 w-11 rounded-lg",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              isChannelsPage && "bg-accent text-foreground"
            )}
            onClick={() => router.push("/channels")}
            title="Channels"
          >
            <Hash className="h-5 w-5" />
          </Button>

          {/* User list button */}
          <UserList variant="workspace-button" />
        </div>
      </ScrollArea>

      {/* User profile button */}
      <div className="flex items-center justify-center p-2 border-t">
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
} 