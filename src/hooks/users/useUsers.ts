"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../useSocket";

interface User {
  id: string;
  username: string;
  profileImageUrl?: string;
  status: "Online" | "Offline";
  lastSeen?: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchUsers = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
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

  return {
    users,
    isLoading,
    error,
    fetchUsers,
  };
} 