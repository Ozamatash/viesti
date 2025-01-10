import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";

// Get channel members
export async function GET(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId: channelIdStr } = await params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      return new NextResponse("Invalid channel ID", { status: 400 });
    }

    const members = await db.channelMembership.findMany({
      where: {
        channelId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("[CHANNEL_MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Add member to channel
export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId: channelIdStr } = await params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      return new NextResponse("Invalid channel ID", { status: 400 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Check if current user is a member of the channel
    const currentUserMembership = await db.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: currentUserId,
          channelId,
        },
      },
    });

    if (!currentUserMembership) {
      return new NextResponse("Not authorized to add members", { status: 403 });
    }

    // Check if user is already a member
    const existingMembership = await db.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
    });

    if (existingMembership) {
      return new NextResponse("User is already a member", { status: 400 });
    }

    // Add user to channel
    const membership = await db.channelMembership.create({
      data: {
        userId,
        channelId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(membership);
  } catch (error) {
    console.error("[CHANNEL_MEMBERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Remove member from channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId: channelIdStr } = await params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      return new NextResponse("Invalid channel ID", { status: 400 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Check if current user is a member of the channel
    const currentUserMembership = await db.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: currentUserId,
          channelId,
        },
      },
    });

    if (!currentUserMembership) {
      return new NextResponse("Not authorized to remove members", { status: 403 });
    }

    // Remove user from channel
    await db.channelMembership.delete({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CHANNEL_MEMBERS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 