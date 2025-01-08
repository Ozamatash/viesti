import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all public channels and channels where user is a member
    const channels = await db.channel.findMany({
      where: {
        isPublic: true,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error("[CHANNELS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, description, isPublic = true } = await req.json();

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Create channel and add creator as member
    const channel = await db.channel.create({
      data: {
        name,
        description,
        isPublic,
        members: {
          create: {
            userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("[CHANNELS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 