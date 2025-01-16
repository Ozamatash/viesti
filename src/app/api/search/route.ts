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

    // Perform search with the new search function
    const searchResults = await searchMessages(query, {
      channelId: channelId ? channelId : undefined,
      conversationId: conversationId || undefined,
      searchMode: mode || "semantic",
    });

    // Return response in the expected format
    return NextResponse.json({
      data: {
        answer: searchResults.answer,
        results: searchResults.results,
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