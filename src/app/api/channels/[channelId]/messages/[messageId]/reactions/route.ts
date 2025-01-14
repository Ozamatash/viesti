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
  params: Promise<{ channelId: string; messageId: string }>;
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

    const { channelId: channelIdStr, messageId: messageIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    const messageId = Number(messageIdStr);

    if (isNaN(channelId) || isNaN(messageId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid channel or message ID",
        details: { channelId: channelIdStr, messageId: messageIdStr }
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

    // Check if user is a member of the channel
    const membership = await db.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
    });

    if (!membership) {
      const error: ApiError = {
        code: ErrorCode.AUTHORIZATION_ERROR,
        message: "Not a member of this channel",
        details: { channelId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
    }

    // Check if user has already reacted with this emoji
    const existingReaction = await db.reaction.findFirst({
      where: {
        messageId,
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
        emitReactionAdded(channelId, messageId, { removed: true, id: existingReaction.id });
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
        messageId,
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
      emitReactionAdded(channelId, messageId, reaction);
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