import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";
import { emitThreadReply } from "~/server/socket";
import { 
  ApiError,
  ErrorCode,
  HttpStatus,
  GetThreadResponse,
  SendThreadReplyRequest,
  SendMessageResponse,
  Thread,
  ChannelMessage,
  FileAttachment,
  Reaction,
  UserStatus
} from "~/types";
import { Document } from "langchain/document";
import { addDocumentToStore } from "~/lib/ai/vector-store";

interface ThreadContext {
  params: Promise<{ messageId: string }>;
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
      status: UserStatus.Online
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
  context: ThreadContext
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

    const { messageId: messageIdStr } = await context.params;
    const messageId = parseInt(messageIdStr);
    if (isNaN(messageId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid message ID",
        details: { field: "messageId", value: messageIdStr }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Get the parent message and its replies
    const threadData = await db.message.findUnique({
      where: { id: messageId },
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
        replies: {
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
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!threadData) {
      const error: ApiError = {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: "Thread not found",
        details: { messageId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.NOT_FOUND });
    }

    // Transform the thread data to match our API types
    const thread: Thread = {
      ...transformMessage(threadData),
      replies: threadData.replies.map(reply => transformMessage(reply))
    };

    const response: GetThreadResponse = {
      data: thread,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.OK });
  } catch (error) {
    console.error("[THREAD_GET]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to fetch thread",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
}

export async function POST(
  request: NextRequest,
  context: ThreadContext
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

    const { messageId: messageIdStr } = await context.params;
    const messageId = parseInt(messageIdStr);
    if (isNaN(messageId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid message ID",
        details: { field: "messageId", value: messageIdStr }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Get the parent message first to get its channelId
    const parentMessage = await db.message.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });

    if (!parentMessage) {
      const error: ApiError = {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: "Parent message not found",
        details: { messageId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.NOT_FOUND });
    }

    const body: SendThreadReplyRequest = await request.json();
    const { content, files } = body;

    if (!content?.trim()) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Message content is required",
        details: { field: "content" }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Create the thread reply
    const replyData = await db.message.create({
      data: {
        content: content.trim(),
        userId,
        parentMessageId: messageId,
        channelId: parentMessage.channelId,
        files: files ? {
          createMany: {
            data: files.map(file => ({
              url: file.url,
              filename: file.filename,
              filetype: file.filetype
            }))
          }
        } : undefined
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
      },
    });

    // Transform the reply data to match our API types
    const reply = transformMessage(replyData);

    // Store thread reply in vector store for AI features
    try {
      const doc = new Document({
        pageContent: content?.trim() || "",
        metadata: {
          messageId: reply.id.toString(),
          channelId: reply.channelId.toString(),
          parentMessageId: messageId.toString(),
          userId,
          timestamp: new Date(reply.createdAt).toISOString(),
          type: "thread_reply" as const
        }
      });
      await addDocumentToStore(doc);
    } catch (error) {
      // Log error but don't fail the request
      console.error("[THREAD_REPLY_POST] Failed to store message in vector store:", error);
    }

    // Emit the thread-reply event to update the UI
    emitThreadReply(parentMessage.channelId, messageId, reply);

    const response: SendMessageResponse = {
      data: reply,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.CREATED });
  } catch (error) {
    console.error("[THREAD_POST]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to create thread reply",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 