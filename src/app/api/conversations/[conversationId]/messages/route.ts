import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";
import { emitNewMessage, getIO } from "~/server/socket";
import { parseConversationId } from "~/lib/conversation";
import { 
  ApiError,
  ErrorCode,
  HttpStatus,
  GetDirectMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  DirectMessage,
  FileAttachment,
  Reaction,
  UserStatus
} from "~/types";
import { Document } from "langchain/document";
import { addDocumentToStore } from "~/lib/ai/vector-store";

interface ConversationContext {
  params: Promise<{ conversationId: string }>;
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
      status: UserStatus.Online // We'll assume online for now
    },
    files: dbMessage.files.map((file: any): FileAttachment => ({
      id: file.id,
      url: file.url,
      filename: file.filename,
      filetype: file.filetype
    })),
    reactions: dbMessage.reactions.map((reaction: any): Reaction => ({
      id: reaction.id,
      emoji: reaction.emoji,
      user: {
        id: reaction.user.id,
        username: reaction.user.username
      }
    }))
  };
}

export async function GET(
  request: NextRequest,
  context: ConversationContext
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    const { conversationId } = await context.params;
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search');
    const skip = Number(url.searchParams.get('skip') || '0');
    const limit = 50;

    // Parse conversation ID to get both user IDs
    const { userId1, userId2 } = parseConversationId(conversationId);

    // Verify that the current user is part of the conversation
    if (userId !== userId1 && userId !== userId2) {
      const error: ApiError = {
        code: ErrorCode.AUTHORIZATION_ERROR,
        message: "Not authorized to view this conversation",
        details: { conversationId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
    }

    // Get messages
    const messages = await db.directMessage.findMany({
      where: {
        conversationId,
        ...(searchTerm ? {
          content: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },
        files: {
          select: {
            id: true,
            url: true,
            filename: true,
            filetype: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: skip,
    });

    // Get total count for pagination
    const totalCount = await db.directMessage.count({
      where: {
        conversationId,
        ...(searchTerm ? {
          content: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        } : {}),
      },
    });

    const response: GetDirectMessagesResponse = {
      data: {
        data: messages.map(transformMessage),
        hasMore: skip + limit < totalCount,
        total: totalCount
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.OK });
  } catch (error) {
    console.error("[CONVERSATION_MESSAGES_GET]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to fetch conversation messages",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
}

export async function POST(
  request: NextRequest,
  context: ConversationContext
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    const { conversationId } = await context.params;
    const body: SendMessageRequest = await request.json();
    const { content, files } = body;

    if (!content?.trim() && (!files || files.length === 0)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Message must contain either text content or files",
        details: { 
          content: content || undefined,
          filesCount: files?.length || 0
        }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    const { userId1, userId2 } = parseConversationId(conversationId);
    const receiverId = userId === userId1 ? userId2 : userId1;

    const messageData = await db.directMessage.create({
      data: {
        content: content?.trim(),
        senderId: userId,
        receiverId,
        conversationId,
        files: files ? {
          create: files.map(file => ({
            url: file.url,
            filename: file.filename,
            filetype: file.filetype,
          })),
        } : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },
        files: {
          select: {
            id: true,
            url: true,
            filename: true,
            filetype: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const message = transformMessage(messageData);

    // Store message in vector store for AI features
    try {
      const doc = new Document({
        pageContent: content?.trim() || "",
        metadata: {
          messageId: message.id.toString(),
          conversationId,
          senderId: userId,
          receiverId,
          timestamp: new Date(message.createdAt),
          type: "direct_message" as const
        }
      });
      await addDocumentToStore(doc);
    } catch (error) {
      // Log error but don't fail the request
      console.error("[CONVERSATION_MESSAGES_POST] Failed to store message in vector store:", error);
    }

    // Emit socket event for real-time updates
    const io = getIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit("new-dm-message", message);
    }

    const response: SendMessageResponse = {
      data: message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.CREATED });
  } catch (error) {
    console.error("[CONVERSATION_MESSAGES_POST]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to send message",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 