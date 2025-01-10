import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { emitReactionAdded } from "~/server/socket";

type Context = {
  params: Promise<{ channelId: string; messageId: string }>;
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

    const { channelId: channelIdStr, messageId: messageIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    const messageId = Number(messageIdStr);

    if (isNaN(channelId) || isNaN(messageId)) {
      return new NextResponse("Invalid channel or message ID", { status: 400 });
    }

    const { emoji } = await request.json();
    if (!emoji) {
      return new NextResponse("Emoji is required", { status: 400 });
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
      return new NextResponse("Not a member of this channel", { status: 403 });
    }

    // Check if user has already reacted with this emoji
    const existingReaction = await db.reaction.findFirst({
      where: {
        messageId,
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
        emitReactionAdded(channelId, messageId, { removed: true, id: existingReaction.id });
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

    // Emit socket event
    try {
      emitReactionAdded(channelId, messageId, reaction);
    } catch (error) {
      console.error("[REACTION_POST] Error emitting reaction:", error);
    }

    return NextResponse.json(reaction);
  } catch (error) {
    console.error("[REACTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 