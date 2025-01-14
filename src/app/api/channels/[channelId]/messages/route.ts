import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";
import { emitNewMessage } from "~/server/socket";
import { 
  ApiError,
  ErrorCode,
  HttpStatus,
  GetChannelMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  ChannelMessage,
  FileAttachment,
  Reaction,
  UserStatus
} from "~/types";

interface MessageContext {
  params: Promise<{ channelId: string }>;
}

// Helper to transform DB message to our API type
function transformMessage(dbMessage: any): ChannelMessage {
  return {
    id: dbMessage.id,
    content: dbMessage.content,
    createdAt: dbMessage.createdAt.toISOString(),
    channelId: dbMessage.channelId,
    parentMessageId: dbMessage.parentMessageId || undefined,
    user: {
      id: dbMessage.user.id,
      username: dbMessage.user.username,
      profileImageUrl: dbMessage.user.profileImageUrl || undefined,
      status: UserStatus.Online // We'll assume online for message authors
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
    })),
    _count: dbMessage._count
  };
}

export async function GET(
  request: NextRequest,
  context: MessageContext
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

    const { channelId: channelIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid channel ID",
        details: { field: "channelId", value: channelIdStr }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Get search term from query params
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search');
    const skip = Number(searchParams.get('skip') || '0');
    const limit = 50;

    // Check if channel is public or user is a member
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!channel) {
      const error: ApiError = {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: "Channel not found",
        details: { channelId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.NOT_FOUND });
    }

    // Only allow access if channel is public or user is a member
    if (!channel.isPublic && channel.members.length === 0) {
      const error: ApiError = {
        code: ErrorCode.AUTHORIZATION_ERROR,
        message: "Not authorized to view this channel",
        details: { channelId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
    }

    // Get messages with user info and reactions
    const messages = await db.message.findMany({
      where: {
        channelId,
        parentMessageId: null, // Only get top-level messages
        ...(searchTerm ? {
          content: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
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
        files: true,
        _count: {
          select: {
            replies: true,
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
    const totalCount = await db.message.count({
      where: {
        channelId,
        parentMessageId: null,
        ...(searchTerm ? {
          content: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        } : {}),
      },
    });

    const response: GetChannelMessagesResponse = {
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
    console.error("[MESSAGES_GET]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to fetch messages",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
}

export async function POST(
  request: NextRequest,
  context: MessageContext
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

    const { channelId: channelIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid channel ID",
        details: { field: "channelId", value: channelIdStr }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

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

    // Check if channel is public or user is a member
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!channel) {
      const error: ApiError = {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: "Channel not found",
        details: { channelId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.NOT_FOUND });
    }

    // Only allow posting if channel is public or user is a member
    if (!channel.isPublic && channel.members.length === 0) {
      const error: ApiError = {
        code: ErrorCode.AUTHORIZATION_ERROR,
        message: "Not authorized to post in this channel",
        details: { channelId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
    }

    // If user is not a member and channel is public, add them as a member
    if (channel.members.length === 0) {
      await db.channelMembership.create({
        data: {
          userId,
          channelId,
        },
      });
    }

    // Create message with optional files
    const messageData = await db.message.create({
      data: {
        content: content?.trim() || "",
        userId,
        channelId,
        files: files ? {
          create: files.map(file => ({
            url: file.url,
            filename: file.filename,
            filetype: file.filetype,
          })),
        } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },
        files: true,
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
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    const message = transformMessage(messageData);

    // Emit the new message event
    try {
      emitNewMessage(channelId, message);
    } catch (error) {
      console.error('[MESSAGES_POST] Error emitting message:', error);
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
    console.error("[MESSAGES_POST]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to send message",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 