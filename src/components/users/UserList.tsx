"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useSocket } from "~/hooks/useSocket";

interface User {
  id: string;
  username: string;
  profileImageUrl?: string;
  status: "Online" | "Offline";
  lastSeen?: string;
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const socket = useSocket();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Listen for presence updates
  useEffect(() => {
    if (!socket) return;

    const handleUserPresence = (data: { userId: string; status: "Online" | "Offline" }) => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === data.userId ? { ...user, status: data.status } : user
        )
      );
    };

    socket.on("user-presence-changed", handleUserPresence);

    return () => {
      socket.off("user-presence-changed", handleUserPresence);
    };
  }, [socket]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <Users className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Users</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="p-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profileImageUrl} />
                    <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span 
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                      user.status === "Online" ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user.username}</span>
                  <span
                    className={`text-xs ${
                      user.status === "Online" ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
} 