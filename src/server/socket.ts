import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { db } from "./db";

export const initializeSocket = (httpServer: NetServer) => {
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket/io',
    addTrailingSlash: false,
  });

  io.on("connection", async (socket) => {
    // Get user ID from auth token or query params
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    if (userId) {
      // Update user status to Online
      await db.user.update({
        where: { id: userId as string },
        data: { status: "Online" },
      });

      // Broadcast user's online status
      io.emit("user-presence-changed", { userId, status: "Online" });
    }

    socket.on("join-channel", (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on("leave-channel", (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("disconnect", async () => {
      if (userId) {
        // Update user status to Offline
        await db.user.update({
          where: { id: userId as string },
          data: { 
            status: "Offline",
            lastSeen: new Date(),
          },
        });

        // Broadcast user's offline status
        io.emit("user-presence-changed", { userId, status: "Offline" });
      }
    });
  });

  return io;
};

export const getIO = () => {
  const io = (global as any).io;
  if (!io) {
    console.warn('Socket.IO not initialized yet, messages will not be real-time');
    return null;
  }
  return io;
};

export const emitNewMessage = (channelId: number, message: any) => {
  const socketServer = getIO();
  if (!socketServer) return;
  
  socketServer.to(`channel:${channelId}`).emit("new-message", message);
}; 