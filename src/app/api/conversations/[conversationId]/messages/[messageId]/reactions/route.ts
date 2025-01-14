import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { emitReactionAdded } from "~/server/socket";
import { 
  ApiError,
  ErrorCode,
  HttpStatus,
  AddReactionRequest,
  AddReactionResponse,
  RemoveReactionResponse,
  Reaction
} from "~/types";

interface ReactionContext {
  params: Promise<{ conversationId: string; messageId: string }>;
}

// Helper to transform DB reaction to our API type
function transformReaction(dbReaction: any): Reaction {
  return {
    id: dbReaction.id,
    emoji: dbReaction.emoji,
    user: {
      id: dbReaction.user.id,
      username: dbReaction.user.username
    }
  };
}

export async function POST(
  request: NextRequest,
  context: ReactionContext
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

    const { conversationId, messageId: messageIdStr } = await context.params;
    const messageId = Number(messageIdStr);

    if (isNaN(messageId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid message ID",
        details: { field: "messageId", value: messageIdStr }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    const body: AddReactionRequest = await request.json();
    const { emoji } = body;

    if (!emoji?.trim()) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Emoji is required",
        details: { field: "emoji" }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Verify the message exists and user is part of the conversation
    const message = await db.directMessage.findUnique({
      where: { id: messageId },
      select: {
        senderId: true,
        receiverId: true,
      },
    });

    if (!message) {
      const error: ApiError = {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: "Message not found",
        details: { messageId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.NOT_FOUND });
    }

    // Check if user is either the sender or receiver
    if (message.senderId !== userId && message.receiverId !== userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHORIZATION_ERROR,
        message: "Not authorized to react to this message",
        details: { messageId, conversationId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
    }

    // Check if user has already reacted with this emoji
    const existingReaction = await db.reaction.findFirst({
      where: {
        directMessageId: messageId,
        userId,
        emoji: emoji.trim(),
      },
    });

    if (existingReaction) {
      // Remove reaction if it exists
      await db.reaction.delete({
        where: {
          id: existingReaction.id,
        },
      });

      // Emit socket event for removal
      try {
        emitReactionAdded(conversationId, messageId, { removed: true, id: existingReaction.id });
      } catch (error) {
        console.error("[REACTION_POST] Error emitting reaction removal:", error);
      }

      const response: RemoveReactionResponse = {
        data: { success: true },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      };

      return NextResponse.json(response, { status: HttpStatus.OK });
    }

    // Add new reaction
    const reactionData = await db.reaction.create({
      data: {
        emoji: emoji.trim(),
        userId,
        directMessageId: messageId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    const reaction = transformReaction(reactionData);

    // Emit socket event
    try {
      emitReactionAdded(conversationId, messageId, reaction);
    } catch (error) {
      console.error("[REACTION_POST] Error emitting reaction:", error);
    }

    const response: AddReactionResponse = {
      data: reaction,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.CREATED });
  } catch (error) {
    console.error("[REACTION_POST]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to handle reaction",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 