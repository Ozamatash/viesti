import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { parseConversationId } from "~/lib/conversation";
import { NextResponse } from "next/server";
import { emitNewMessage, getIO } from "~/server/socket";

export async function GET(
  request: Request,
  context: { params: { conversationId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId } = context.params;
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search');

    // Parse conversation ID to get both user IDs
    const { userId1, userId2 } = parseConversationId(conversationId);

    // Verify that the current user is part of the conversation
    if (userId !== userId1 && userId !== userId2) {
      return new NextResponse("Not authorized to view this conversation", {
        status: 403,
      });
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
      take: 50,
    });

    // Format messages to match channel message format
    const formattedMessages = messages.map((message) => ({
      ...message,
      user: message.sender,
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("[CONVERSATION_MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: { conversationId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId } = await context.params;
    const { content, fileUrls } = await request.json();

    if (!content && (!fileUrls || fileUrls.length === 0)) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const { userId1, userId2 } = parseConversationId(conversationId);
    const receiverId = userId === userId1 ? userId2 : userId1;

    const message = await db.directMessage.create({
      data: {
        content,
        senderId: userId,
        receiverId,
        conversationId,
        files: fileUrls ? {
          create: fileUrls.map((url: string) => ({
            url,
            filename: url.split("/").pop() || "file",
            filetype: url.split(".").pop() || "unknown",
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

    // Format message to match GET response
    const formattedMessage = {
      ...message,
      user: message.sender,
    };

    // Emit socket event for real-time updates
    const io = getIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit("new-dm-message", formattedMessage);
    }

    return NextResponse.json(formattedMessage);
  } catch (error) {
    console.error("[CONVERSATION_MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 