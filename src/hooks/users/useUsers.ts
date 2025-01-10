"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../useSocket";
import { useUser } from "@clerk/nextjs";

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
  const { isLoaded: isAuthLoaded, isSignedIn } = useUser();

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

  // Initial fetch - only when auth is loaded and user is signed in
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      fetchUsers();
    }
  }, [isAuthLoaded, isSignedIn]);

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
    isLoading: isLoading || !isAuthLoaded,
    error,
    fetchUsers,
  };
} 