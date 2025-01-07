import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "@clerk/nextjs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

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

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, description } = await req.json();

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Ensure user exists in database
    await db.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        username: userId, // We'll update this with actual username later
      },
    });

    // Create channel and add creator as member
    const channel = await db.channel.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId,
          },
        },
      },
      include: {
        members: true,
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