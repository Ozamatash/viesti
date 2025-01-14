import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";
import { 
  CreateChannelRequest,
  GetChannelsResponse, 
  CreateChannelResponse,
  HttpStatus,
  ErrorCode,
  ApiError,
  Channel
} from "~/types";

/**
 * GET /api/channels
 * Get all public channels and channels where user is a member
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    // Get all public channels and channels where user is a member
    const channels = await db.channel.findMany({
      where: {
        OR: [
          { isPublic: true },
          { members: { some: { userId } } }
        ]
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
        members: {
          where: { userId },
          select: { userId: true }
        }
      },
    });

    // Transform dates to ISO strings to match Channel type
    const transformedChannels: Channel[] = channels.map(channel => ({
      ...channel,
      createdAt: channel.createdAt.toISOString(),
    }));

    const response: GetChannelsResponse = {
      data: transformedChannels,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.OK });
  } catch (error) {
    console.error("[CHANNELS_GET]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to fetch channels",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
}

/**
 * POST /api/channels
 * Create a new channel
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    const body: CreateChannelRequest = await req.json();
    const { name, description, isPrivate = false, members = [] } = body;

    if (!name?.trim()) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Channel name is required",
        details: { field: "name" }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Check if channel name already exists
    const existing = await db.channel.findFirst({
      where: { name: name.trim() }
    });

    if (existing) {
      const error: ApiError = {
        code: ErrorCode.RESOURCE_CONFLICT,
        message: "Channel name already exists",
        details: { field: "name" }
      };
      return NextResponse.json({ error }, { status: HttpStatus.CONFLICT });
    }

    // Create channel and add creator as member
    const channel = await db.channel.create({
      data: {
        name: name.trim(),
        description,
        isPublic: !isPrivate,
        members: {
          create: [
            { userId },
            ...members.map(memberId => ({ userId: memberId }))
          ],
        },
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
        members: true
      },
    });

    // Transform dates to ISO strings to match Channel type
    const transformedChannel: Channel = {
      ...channel,
      createdAt: channel.createdAt.toISOString(),
    };

    const response: CreateChannelResponse = {
      data: transformedChannel,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.CREATED });
  } catch (error) {
    console.error("[CHANNELS_POST]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to create channel",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 