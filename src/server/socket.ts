import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiRequest } from "next";
import { db } from "./db";

export type NextApiResponseServerIO = NextApiRequest & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const initSocketServer = (server: NetServer) => {
  if (!(server as any).io) {
    console.log("Socket.IO server initializing...");

    const io = new SocketIOServer(server, {
      path: "/api/socket/io",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Handle user presence
      socket.on("presence", async ({ userId, status }) => {
        try {
          await db.user.update({
            where: { id: userId },
            data: {
              status: status,
              lastSeen: new Date(),
            },
          });

          io.emit("user-presence-changed", { userId, status });
        } catch (error) {
          console.error("Error updating user presence:", error);
        }
      });

      // Handle joining channels
      socket.on("join-channel", (channelId: string) => {
        socket.join(`channel:${channelId}`);
      });

      // Handle leaving channels
      socket.on("leave-channel", (channelId: string) => {
        socket.leave(`channel:${channelId}`);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    (server as any).io = io;
  }

  return (server as any).io as SocketIOServer;
}; 