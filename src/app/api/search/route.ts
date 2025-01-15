import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { getVectorStore } from "~/lib/ai/vector-store";
import { searchMessages } from "~/lib/ai/search";
import { ApiError, ErrorCode, HttpStatus } from "~/types";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    // Get search parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const mode = searchParams.get('mode') as "semantic" | "keyword";
    const channelId = searchParams.get('channelId');
    const conversationId = searchParams.get('conversationId');

    if (!query) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Search query is required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Validate access to channel/conversation
    if (channelId) {
      const channel = await db.channel.findUnique({
        where: { id: Number(channelId) },
        include: {
          members: {
            where: { userId },
          },
        },
      });

      if (!channel) {
        const error: ApiError = {
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: "Channel not found",
        };
        return NextResponse.json({ error }, { status: HttpStatus.NOT_FOUND });
      }

      if (!channel.isPublic && channel.members.length === 0) {
        const error: ApiError = {
          code: ErrorCode.AUTHORIZATION_ERROR,
          message: "Not authorized to search this channel",
        };
        return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
      }
    }

    if (conversationId) {
      // Verify user is part of the conversation
      const { userId1, userId2 } = parseConversationId(conversationId);
      if (userId !== userId1 && userId !== userId2) {
        const error: ApiError = {
          code: ErrorCode.AUTHORIZATION_ERROR,
          message: "Not authorized to search this conversation",
        };
        return NextResponse.json({ error }, { status: HttpStatus.FORBIDDEN });
      }
    }

    let results;
    if (mode === "semantic") {
      // Use vector store for semantic search
      const vectorStore = await getVectorStore();
      results = await searchMessages(query, {
        channelId: channelId ? channelId : undefined,
        conversationId: conversationId || undefined,
        searchMode: mode,
      });
    } else {
      // Use database for keyword search
      const where = {
        content: {
          contains: query,
          mode: 'insensitive' as const,
        },
        ...(channelId && {
          channelId: Number(channelId),
        }),
        ...(conversationId && {
          conversationId,
        }),
      };

      const dbResults = await db.message.findMany({
        where,
        include: {
          user: {
            select: {
              username: true,
              profileImageUrl: true,
            },
          },
          channel: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      });

      // Transform results to match SearchResult type
      results = dbResults.map(message => ({
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        user: {
          username: message.user.username,
          profileImageUrl: message.user.profileImageUrl,
        },
        ...(message.channel && {
          channel: {
            name: message.channel.name,
          },
        }),
        ...(message._count.replies > 0 && {
          thread: {
            id: message.id,
            messageCount: message._count.replies,
          },
        }),
      }));
    }

    // Return response in the expected format
    return NextResponse.json({
      data: {
        results,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });
  } catch (error) {
    console.error("Search error:", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to perform search",
    };
    return NextResponse.json(
      { error: apiError },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}

function parseConversationId(conversationId: string): { userId1: string; userId2: string } {
  const [userId1 = "", userId2 = ""] = conversationId.split("_");
  return { userId1, userId2 };
} 