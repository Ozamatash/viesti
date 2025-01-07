import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs";

export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const channelId = parseInt(params.channelId);
    if (isNaN(channelId)) {
      return new NextResponse("Invalid channel ID", { status: 400 });
    }

    // Check if user is member of channel
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

    // Get messages with user info and reactions
    const messages = await db.message.findMany({
      where: {
        channelId,
        parentMessageId: null, // Only get top-level messages
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
      take: 50, // Limit to last 50 messages as per PRD
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[CHANNEL_MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const channelId = parseInt(params.channelId);
    if (isNaN(channelId)) {
      return new NextResponse("Invalid channel ID", { status: 400 });
    }

    const { content, fileUrls } = await req.json();

    if (!content && (!fileUrls || fileUrls.length === 0)) {
      return new NextResponse("Message content or files required", {
        status: 400,
      });
    }

    // Check if user is member of channel
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

    // Create message with optional files
    const message = await db.message.create({
      data: {
        content: content || "",
        userId,
        channelId,
        files: fileUrls
          ? {
              create: fileUrls.map((url: string) => ({
                url,
                filename: url.split("/").pop() || "unknown",
                filetype: url.split(".").pop() || "unknown",
              })),
            }
          : undefined,
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
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("[CHANNEL_MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 