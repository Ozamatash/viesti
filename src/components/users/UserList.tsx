"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useUsers } from "~/hooks/users/useUsers";
import { Skeleton } from "~/components/ui/skeleton";
import { RefreshCcw } from "lucide-react";
import { cn } from "~/lib/utils";

interface UserListProps {
  variant?: "sheet" | "workspace" | "workspace-button";
}

export function UserList({ variant = "sheet" }: UserListProps) {
  const { users, isLoading, error, fetchUsers } = useUsers();

  const UserListContent = () => {
    if (isLoading) {
      return (
        <div className="divide-y divide-border/30">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers()}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border/30">
        {users.map((user) => (
          <div
            key={user.id}
            className={cn(
              "flex items-center gap-3 p-3 transition-colors",
              variant === "sheet" 
                ? "hover:bg-accent hover:text-accent-foreground"
                : "hover:bg-white/10 rounded-md mx-1"
            )}
          >
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.profileImageUrl} />
                <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span 
                className={cn(
                  "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2",
                  variant === "sheet" ? "border-background" : "border-[#1a1d1e]",
                  user.status === "Online" ? "bg-green-500" : "bg-muted"
                )}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{user.username}</span>
              <span
                className={cn(
                  "text-xs",
                  user.status === "Online" 
                    ? "text-green-600" 
                    : "text-muted-foreground/80"
                )}
              >
                {user.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (variant === "workspace") {
    return <UserListContent />;
  }

  if (variant === "workspace-button") {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-11 w-11 rounded-lg",
              "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Users className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="w-[280px] p-0 border-0 mt-0 data-[state=open]:mt-0" 
          style={{ marginTop: 0 }}
        >
          <SheetHeader className="p-4 border-b bg-muted/30">
            <SheetTitle>Users</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <UserListContent />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <Users className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-4 border-b bg-muted/30">
          <SheetTitle>Users</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          <UserListContent />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
} 