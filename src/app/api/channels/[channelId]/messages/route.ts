import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";
import { emitNewMessage } from "~/server/socket";

type Context = {
  params: Promise<{ channelId: string }>;
};

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId: channelIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      return new NextResponse("Invalid channel ID", { status: 400 });
    }

    // Get search term from query params
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search');
    const skip = Number(searchParams.get('skip') || '0');

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
      return new NextResponse("Channel not found", { status: 404 });
    }

    // Only allow access if channel is public or user is a member
    if (!channel.isPublic && channel.members.length === 0) {
      return new NextResponse("Not authorized to view this channel", { status: 403 });
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
      take: 50,
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

    return NextResponse.json({
      messages,
      hasMore: skip + 50 < totalCount,
    });
  } catch (error) {
    console.error("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId: channelIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      return new NextResponse("Invalid channel ID", { status: 400 });
    }

    const { content, fileUrls } = await request.json();

    if (!content && (!fileUrls || fileUrls.length === 0)) {
      return new NextResponse("Message content or files required", {
        status: 400,
      });
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
      return new NextResponse("Channel not found", { status: 404 });
    }

    // Only allow posting if channel is public or user is a member
    if (!channel.isPublic && channel.members.length === 0) {
      return new NextResponse("Not authorized to post in this channel", { status: 403 });
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

    // Emit the new message event
    try {
      emitNewMessage(channelId, message);
    } catch (error) {
      console.error('[MESSAGES_POST] Error emitting message:', error);
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 