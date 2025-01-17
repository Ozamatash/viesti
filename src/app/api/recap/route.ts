import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateChannelRecap, generateThreadRecap, generateDirectMessageRecap } from "~/lib/ai/recap";
import { ApiError, ErrorCode, HttpStatus } from "~/types";
import { RecapRequest, RecapResponse } from "~/types";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Not authenticated",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    // Parse request
    const body = await req.json();
    const {
      type,
      id,
      startTime,
      endTime,
      maxMessages,
      includeThreads,
      includeTopics,
      includeParticipants
    } = body as RecapRequest;

    // Validate required fields
    if (!type || !id) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Missing required fields",
        details: { required: ["type", "id"] }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Validate dates if provided (only for non-thread recaps)
    if (type !== 'thread') {
      if (startTime && isNaN(new Date(startTime).getTime())) {
        const error: ApiError = {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid startTime parameter",
          details: { startTime }
        };
        return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
      }

      if (endTime && isNaN(new Date(endTime).getTime())) {
        const error: ApiError = {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid endTime parameter",
          details: { endTime }
        };
        return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
      }
    }

    // Parse options - for threads, we ignore time-related options
    const options = type === 'thread' 
      ? {
          ...(includeTopics !== undefined && { includeTopics }),
          ...(includeParticipants !== undefined && { includeParticipants })
        }
      : {
          ...(startTime && { startTime: new Date(startTime) }),
          ...(endTime && { endTime: new Date(endTime) }),
          ...(maxMessages && { maxMessages: Number(maxMessages) }),
          ...(includeThreads !== undefined && { includeThreads }),
          ...(includeTopics !== undefined && { includeTopics }),
          ...(includeParticipants !== undefined && { includeParticipants })
        };

    // Generate recap based on type
    let recap;
    switch (type) {
      case "channel":
        recap = await generateChannelRecap(id, options);
        break;
      case "thread":
        recap = await generateThreadRecap(id, options);
        break;
      case "direct":
        recap = await generateDirectMessageRecap(id, options);
        break;
      default:
        const error: ApiError = {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid recap type",
          details: { type, supported: ["channel", "thread", "direct"] }
        };
        return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Format response - use current time range for threads
    const response: RecapResponse = {
      data: {
        ...recap,
        timeRange: type === 'thread'
          ? {
              start: new Date(0).toISOString(), // Beginning of time
              end: new Date().toISOString() // Current time
            }
          : {
              start: recap.timeRange.start.toISOString(),
              end: recap.timeRange.end.toISOString()
            },
        generatedAt: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[RECAP] Error generating recap:", err);
    const error: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to generate recap"
    };
    return NextResponse.json({ error }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 