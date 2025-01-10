import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { generateConversationId } from "~/lib/conversation";
import { NextRequest, NextResponse } from "next/server";

type Context = {
  params: Promise<{ userId: string }>;
};

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    const { userId: otherUserId } = await context.params;
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
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
    const otherUser = await db.user.findUnique({
      where: {
        id: otherUserId,
      },
    });

    if (!otherUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json({
      conversationId,
      messages,
      otherUser,
    });
  } catch (error) {
    console.error("[CONVERSATION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 