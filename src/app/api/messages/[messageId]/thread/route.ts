import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";
import { emitThreadReply } from "~/server/socket";

type Context = {
  params: Promise<{ messageId: string }>;
};

export async function GET(
  req: Request,
  context: Context
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const params = await context.params;
    const messageId = parseInt(params.messageId);
    if (isNaN(messageId)) {
      return new NextResponse("Invalid message ID", { status: 400 });
    }

    // Get the parent message and its replies
    const thread = await db.message.findUnique({
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

    if (!thread) {
      return new NextResponse("Thread not found", { status: 404 });
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error("[THREAD_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: Context
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const params = await context.params;
    const messageId = parseInt(params.messageId);
    if (isNaN(messageId)) {
      return new NextResponse("Invalid message ID", { status: 400 });
    }

    // Get the parent message first to get its channelId
    const parentMessage = await db.message.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });

    if (!parentMessage) {
      return new NextResponse("Parent message not found", { status: 404 });
    }

    const json = await req.json();
    const { content } = json;

    if (!content || typeof content !== "string") {
      return new NextResponse("Invalid content", { status: 400 });
    }

    // Create the thread reply
    const reply = await db.message.create({
      data: {
        content,
        userId,
        parentMessageId: messageId,
        channelId: parentMessage.channelId,
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

    // Emit the thread-reply event to update the UI
    // Make sure to emit to the channel room
    emitThreadReply(parentMessage.channelId, messageId, {
      ...reply,
      channelId: parentMessage.channelId,
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error("[THREAD_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 