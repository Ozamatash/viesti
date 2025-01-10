import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { emitReactionAdded } from "~/server/socket";

type Context = {
  params: Promise<{ conversationId: string; messageId: string }>;
};

export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId, messageId: messageIdStr } = await context.params;
    const messageId = Number(messageIdStr);

    if (isNaN(messageId)) {
      return new NextResponse("Invalid message ID", { status: 400 });
    }

    const { emoji } = await request.json();
    if (!emoji) {
      return new NextResponse("Emoji is required", { status: 400 });
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
      return new NextResponse("Message not found", { status: 404 });
    }

    // Check if user is either the sender or receiver
    if (message.senderId !== userId && message.receiverId !== userId) {
      return new NextResponse("Not authorized", { status: 403 });
    }

    // Check if user has already reacted with this emoji
    const existingReaction = await db.reaction.findFirst({
      where: {
        directMessageId: messageId,
        userId,
        emoji,
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

      return NextResponse.json({ removed: true, id: existingReaction.id });
    }

    // Add new reaction
    const reaction = await db.reaction.create({
      data: {
        emoji,
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

    // Emit socket event
    try {
      emitReactionAdded(conversationId, messageId, reaction);
    } catch (error) {
      console.error("[REACTION_POST] Error emitting reaction:", error);
    }

    return NextResponse.json(reaction);
  } catch (error) {
    console.error("[REACTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 