import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { 
  ApiError,
  ErrorCode,
  HttpStatus,
  GetUsersResponse,
  User,
  UserStatus
} from "~/types";

// Helper to transform DB user to our API type
function transformUser(dbUser: any): User {
  return {
    id: dbUser.id,
    username: dbUser.username,
    profileImageUrl: dbUser.profileImageUrl || undefined,
    status: dbUser.status as UserStatus,
    lastSeen: dbUser.lastSeen?.toISOString()
  };
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('search');
    const skip = Number(url.searchParams.get('skip') || '0');
    const limit = Number(url.searchParams.get('limit') || '50');

    // Get all users except the current user
    const users = await db.user.findMany({
      where: {
        NOT: {
          id: userId,
        },
        ...(searchTerm ? {
          username: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        } : {}),
      },
      select: {
        id: true,
        username: true,
        profileImageUrl: true,
        status: true,
        lastSeen: true,
      },
      orderBy: {
        username: "asc",
      },
      take: limit,
      skip: skip,
    });

    // Get total count for pagination
    const totalCount = await db.user.count({
      where: {
        NOT: {
          id: userId,
        },
        ...(searchTerm ? {
          username: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        } : {}),
      },
    });

    // Update current user's status to Online
    await db.user.update({
      where: { id: userId },
      data: { status: UserStatus.Online },
    });

    const response: GetUsersResponse = {
      data: {
        data: users.map(transformUser),
        hasMore: skip + limit < totalCount,
        total: totalCount
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.OK });
  } catch (error) {
    console.error("[USERS_GET]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to fetch users",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 