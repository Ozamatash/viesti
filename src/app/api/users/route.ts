import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all users except the current user
    const users = await db.user.findMany({
      where: {
        NOT: {
          id: userId,
        },
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
    });

    // Update current user's status to Online
    await db.user.update({
      where: { id: userId },
      data: { status: "Online" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[USERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 