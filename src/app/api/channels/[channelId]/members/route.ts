import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";
import { 
  ApiError,
  ErrorCode,
  HttpStatus,
  GetChannelMembersResponse,
  JoinChannelResponse,
  ChannelMembership,
  UserStatus
} from "~/types";

interface MemberContext {
  params: Promise<{ channelId: string }>;
}

// Helper to transform DB membership to our API type
function transformMembership(dbMembership: any): ChannelMembership {
  return {
    userId: dbMembership.userId,
    channelId: dbMembership.channelId,
    joinedAt: dbMembership.createdAt.toISOString(),
    user: {
      id: dbMembership.user.id,
      username: dbMembership.user.username,
      profileImageUrl: dbMembership.user.profileImageUrl || undefined,
      status: UserStatus.Online // We'll assume online for now
    }
  };
}

// Get channel members
export async function GET(
  request: NextRequest,
  context: MemberContext
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

    const { channelId: channelIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid channel ID",
        details: { field: "channelId", value: channelIdStr }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    const memberships = await db.channelMembership.findMany({
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

    const response: GetChannelMembersResponse = {
      data: memberships.map(transformMembership),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.OK });
  } catch (error) {
    console.error("[CHANNEL_MEMBERS_GET]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to fetch channel members",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
}

// Add member to channel
export async function POST(
  request: NextRequest,
  context: MemberContext
) {
  try {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    const { channelId: channelIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid channel ID",
        details: { field: "channelId", value: channelIdStr }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    const body = await request.json();
    const { userId } = body;
    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "User ID is required",
        details: { field: "userId" }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
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
      const error: ApiError = {
        code: ErrorCode.AUTHORIZATION_ERROR,
        message: "Not authorized to add members",
        details: { channelId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
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
      const error: ApiError = {
        code: ErrorCode.RESOURCE_CONFLICT,
        message: "User is already a member",
        details: { userId, channelId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.CONFLICT });
    }

    // Add user to channel
    const membershipData = await db.channelMembership.create({
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

    const membership = transformMembership(membershipData);

    const response: JoinChannelResponse = {
      data: membership,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.CREATED });
  } catch (error) {
    console.error("[CHANNEL_MEMBERS_POST]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to add channel member",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
}

// Remove member from channel
export async function DELETE(
  request: NextRequest,
  context: MemberContext
) {
  try {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    const { channelId: channelIdStr } = await context.params;
    const channelId = Number(channelIdStr);
    if (isNaN(channelId)) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid channel ID",
        details: { field: "channelId", value: channelIdStr }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    const body = await request.json();
    const { userId } = body;
    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "User ID is required",
        details: { field: "userId" }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
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
      const error: ApiError = {
        code: ErrorCode.AUTHORIZATION_ERROR,
        message: "Not authorized to remove members",
        details: { channelId }
      };
      return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
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

    return NextResponse.json(null, { status: HttpStatus.NO_CONTENT });
  } catch (error) {
    console.error("[CHANNEL_MEMBERS_DELETE]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to remove channel member",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 