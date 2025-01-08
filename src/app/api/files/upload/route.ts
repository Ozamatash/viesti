import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadFile } from "~/lib/supabase-client";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return new NextResponse("File type not allowed", { status: 400 });
    }

    if (file.size > maxSize) {
      return new NextResponse("File too large (max 5MB)", { status: 400 });
    }

    const result = await uploadFile(file, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[FILE_UPLOAD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 