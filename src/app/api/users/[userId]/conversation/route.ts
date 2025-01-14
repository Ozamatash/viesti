import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { generateConversationId } from "~/lib/conversation";
import { NextRequest, NextResponse } from "next/server";
import { 
  ApiError,
  ErrorCode,
  HttpStatus,
  GetConversationResponse,
  DirectMessage,
  User,
  UserStatus
} from "~/types";

interface ConversationContext {
  params: Promise<{ userId: string }>;
}

// Helper to transform DB message to our API type
function transformMessage(dbMessage: any): DirectMessage {
  return {
    id: dbMessage.id,
    content: dbMessage.content,
    createdAt: dbMessage.createdAt.toISOString(),
    senderId: dbMessage.senderId,
    receiverId: dbMessage.receiverId,
    conversationId: dbMessage.conversationId,
    user: {
      id: dbMessage.sender.id,
      username: dbMessage.sender.username,
      profileImageUrl: dbMessage.sender.profileImageUrl || undefined,
      status: dbMessage.sender.status as UserStatus
    },
    files: dbMessage.files.map((file: any) => ({
      id: file.id,
      url: file.url,
      filename: file.filename,
      filetype: file.filetype
    })),
    reactions: dbMessage.reactions.map((reaction: any) => ({
      id: reaction.id,
      emoji: reaction.emoji,
      user: {
        id: reaction.user.id,
        username: reaction.user.username
      }
    }))
  };
}

// Helper to transform DB user to our API type
function transformUser(dbUser: any): User {
  return {
    id: dbUser.id,
    username: dbUser.username,
    profileImageUrl: dbUser.profileImageUrl || undefined,
    status: dbUser.status as UserStatus,
    lastSeen: dbUser.lastSeen?.toISOString()
  };
}

export async function GET(
  request: NextRequest,
  context: ConversationContext
) {
  try {
    const { userId: otherUserId } = await context.params;
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    // Generate consistent conversation ID
    const conversationId = generateConversationId(currentUserId, otherUserId);

    // Find existing messages or create empty array
    const messages = await db.directMessage.findMany({
      where: {
        conversationId: conversationId,
      },
      include: {
        sender: true,
        receiver: true,
        files: true,
        reactions: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30, // Initial load of latest 30 messages
    });

    // Get other user's info
    const otherUserData = await db.user.findUnique({
      where: {
        id: otherUserId,
      },
    });

    if (!otherUserData) {
      const error: ApiError = {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: "User not found",
        details: { userId: otherUserId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.NOT_FOUND });
    }

    const response: GetConversationResponse = {
      data: {
        conversationId,
        messages: messages.map(transformMessage),
        otherUser: transformUser(otherUserData)
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.OK });
  } catch (error) {
    console.error("[CONVERSATION_GET]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to fetch conversation",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 