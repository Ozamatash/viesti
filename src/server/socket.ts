import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { db } from "./db";
import { 
  SocketEventName, 
  UserStatus, 
  ChannelMessage, 
  DirectMessage,
  UserPresenceEvent,
  ReactionEvent,
  ThreadReplyEvent
} from "~/types";

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
        status: UserStatus.Online,
        lastSeen: new Date(),
      },
    });
    
    const presenceEvent: UserPresenceEvent = { 
      userId, 
      status: UserStatus.Online 
    };
    io.emit(SocketEventName.UserPresenceChanged, presenceEvent);

    // Clear any existing timeout for this user
    if (timeouts.has(userId as string)) {
      clearTimeout(timeouts.get(userId as string));
      timeouts.delete(userId as string);
    }

    // Handle presence updates
    socket.on(SocketEventName.UserPresenceChanged, async (event: UserPresenceEvent) => {
      await db.user.update({
        where: { id: event.userId },
        data: { 
          status: event.status,
          lastSeen: new Date(),
        },
      });
      io.emit(SocketEventName.UserPresenceChanged, event);
    });

    socket.on(SocketEventName.JoinChannel, (channelId: number) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on(SocketEventName.LeaveChannel, (channelId: number) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on(SocketEventName.JoinConversation, (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on(SocketEventName.LeaveConversation, (conversationId: string) => {
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
              status: UserStatus.Offline,
              lastSeen: new Date(),
            },
          });
          
          const offlineEvent: UserPresenceEvent = {
            userId,
            status: UserStatus.Offline
          };
          io.emit(SocketEventName.UserPresenceChanged, offlineEvent);
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

export const emitNewMessage = (channelId: number, message: ChannelMessage) => {
  const socketServer = getIO();
  if (!socketServer) return;
  
  socketServer.to(`channel:${channelId}`).emit(SocketEventName.NewMessage, message);
};

export const emitNewDirectMessage = (conversationId: string, message: DirectMessage) => {
  const socketServer = getIO();
  if (!socketServer) return;
  
  socketServer.to(`conversation:${conversationId}`).emit(SocketEventName.NewDirectMessage, message);
};

export function emitReactionAdded(
  channelOrConversationId: string | number,
  messageId: number,
  reaction: ReactionEvent['reaction']
) {
  const socketServer = getIO();
  if (!socketServer) return;
  
  // Format the room ID correctly based on whether it's a channel or conversation
  const roomId = typeof channelOrConversationId === 'number' 
    ? `channel:${channelOrConversationId}`
    : `conversation:${channelOrConversationId}`;

  const event: ReactionEvent = {
    messageId,
    reaction,
  };
  socketServer.to(roomId).emit(SocketEventName.ReactionAdded, event);
}

export function emitThreadReply(channelId: number, messageId: number, reply: ChannelMessage) {
  const socketServer = getIO();
  if (!socketServer) return;
  
  const event: ThreadReplyEvent = {
    messageId,
    reply,
  };
  socketServer.to(`channel:${channelId}`).emit(SocketEventName.ThreadReply, event);
} 