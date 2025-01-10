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
    if (!userId) return;

    // Store timeout in a map to handle multiple connections
    const timeouts = new Map<string, NodeJS.Timeout>();

    // Update user status to Online
    await db.user.update({
      where: { id: userId as string },
      data: { 
        status: "Online",
        lastSeen: new Date(),
      },
    });
    io.emit("user-presence-changed", { userId, status: "Online" });

    // Clear any existing timeout for this user
    if (timeouts.has(userId as string)) {
      clearTimeout(timeouts.get(userId as string));
      timeouts.delete(userId as string);
    }

    // Handle presence updates
    socket.on("user-presence-changed", async ({ userId, status }) => {
      await db.user.update({
        where: { id: userId as string },
        data: { 
          status: status,
          lastSeen: new Date(),
        },
      });
      io.emit("user-presence-changed", { userId, status });
    });

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
      if (!userId) return;

      // Clear any existing timeout
      if (timeouts.has(userId as string)) {
        clearTimeout(timeouts.get(userId as string));
      }

      const timeout = setTimeout(async () => {
        // Check if user has any other active connections
        const sockets = await io.fetchSockets();
        const userSockets = sockets.filter(s => 
          (s.handshake.auth.userId || s.handshake.query.userId) === userId
        );

        // Only update status if no other connections exist
        if (userSockets.length === 0) {
          await db.user.update({
            where: { id: userId as string },
            data: { 
              status: "Offline",
              lastSeen: new Date(),
            },
          });
          io.emit("user-presence-changed", { userId, status: "Offline" });
        }
        timeouts.delete(userId as string);
      }, 1 * 60 * 1000); // 1 minute

      timeouts.set(userId as string, timeout);
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

export function emitReactionAdded(
  channelOrConversationId: string | number,
  messageId: number,
  reaction: any
) {
  const socketServer = getIO();
  if (!socketServer) return;
  
  // Format the room ID correctly based on whether it's a channel or conversation
  const roomId = typeof channelOrConversationId === 'number' 
    ? `channel:${channelOrConversationId}`
    : `conversation:${channelOrConversationId}`;

  socketServer.to(roomId).emit("reaction-added", {
    messageId,
    reaction,
  });
}

export function emitThreadReply(channelId: number, messageId: number, reply: any) {
  const socketServer = getIO();
  if (!socketServer) return;
  
  socketServer.to(`channel:${channelId}`).emit("thread-reply", {
    messageId,
    reply,
  });
} 