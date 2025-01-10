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
        data: { 
          status: "Online",
          lastSeen: new Date(),
        },
      });

      // Broadcast user's online status
      io.emit("user-presence-changed", { userId, status: "Online" });

      // Handle reconnection
      socket.on("reconnect", async () => {
        await db.user.update({
          where: { id: userId as string },
          data: { 
            status: "Online",
            lastSeen: new Date(),
          },
        });
        io.emit("user-presence-changed", { userId, status: "Online" });
      });
    }

    socket.on("join-channel", (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on("leave-channel", (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("disconnect", async () => {
      if (userId) {
        // Update user status to Offline with a small delay
        // This allows for quick reconnections without flickering status
        setTimeout(async () => {
          const user = await db.user.findUnique({
            where: { id: userId as string },
            select: { status: true, lastSeen: true },
          });

          // Only update if the last status update was from this connection
          if (user && user.status === "Online") {
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
        }, 2000); // 2 second delay to handle quick reconnects
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

export const emitNewDirectMessage = (conversationId: string, message: any) => {
  const socketServer = getIO();
  if (!socketServer) return;
  
  socketServer.to(`conversation:${conversationId}`).emit("new-dm-message", message);
}; 