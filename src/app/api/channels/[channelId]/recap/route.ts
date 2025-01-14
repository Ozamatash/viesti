import { NextRequest, NextResponse } from "next/server";
import { generateChannelRecap } from "~/lib/ai/recap";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const startTimeParam = searchParams.get("startTime");
    const endTimeParam = searchParams.get("endTime");
    const maxMessagesParam = searchParams.get("maxMessages");

    // Parse and validate parameters
    const options = {
      ...(startTimeParam && { startTime: new Date(startTimeParam) }),
      ...(endTimeParam && { endTime: new Date(endTimeParam) }),
      ...(maxMessagesParam && { maxMessages: parseInt(maxMessagesParam, 10) })
    };

    // Validate dates
    if (startTimeParam && isNaN(new Date(startTimeParam).getTime())) {
      return NextResponse.json(
        { error: "Invalid startTime parameter" },
        { status: 400 }
      );
    }
    if (endTimeParam && isNaN(new Date(endTimeParam).getTime())) {
      return NextResponse.json(
        { error: "Invalid endTime parameter" },
        { status: 400 }
      );
    }

    // Validate maxMessages
    if (maxMessagesParam && isNaN(parseInt(maxMessagesParam, 10))) {
      return NextResponse.json(
        { error: "Invalid maxMessages parameter" },
        { status: 400 }
      );
    }

    // Generate recap
    const recap = await generateChannelRecap(params.channelId, options);

    return NextResponse.json(recap);
  } catch (error) {
    console.error("Error generating channel recap:", error);
    return NextResponse.json(
      { error: "Failed to generate channel recap" },
      { status: 500 }
    );
  }
}

// Example usage:
// GET /api/channels/123/recap
// GET /api/channels/123/recap?startTime=2024-01-01T00:00:00Z&endTime=2024-01-02T00:00:00Z&maxMessages=50 