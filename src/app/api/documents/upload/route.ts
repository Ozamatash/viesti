import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { addDocumentToStore } from "~/lib/ai/vector-store";
import { db } from "~/server/db";
import { MessageMetadata } from "~/types";
import { Document } from "langchain/document";

const ALLOWED_FILE_TYPES = ["pdf", "txt", "csv", "docx"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const channelId = formData.get("channelId") as string;
    const conversationId = formData.get("conversationId") as string | null;
    const threadId = formData.get("threadId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const fileType = file.name.split(".").pop()?.toLowerCase();
    if (!fileType || !ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(uploadsDir, file.name);
    await writeFile(filePath, buffer);

    // Create document record in database
    const document = await db.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          fileName: file.name,
          filePath,
          fileType,
          uploadedBy: userId,
          ...(channelId && { channelId: parseInt(channelId, 10) }),
          ...(conversationId && { conversationId }),
          ...(threadId && { threadId: parseInt(threadId, 10) })
        }
      });

      // Process and index the document
      const metadata: MessageMetadata = {
        messageId: doc.id.toString(),
        channelId: doc.channelId?.toString(),
        conversationId: doc.conversationId || undefined,
        userId: doc.uploadedBy,
        timestamp: doc.createdAt.toISOString(),
        type: "message",
        threadId: doc.threadId?.toString() || undefined,
        senderId: userId
      };

      await addDocumentToStore(new Document({
        pageContent: await file.text(),
        metadata
      }));

      return doc;
    });

    return NextResponse.json({ 
      data: document,
      message: "Document uploaded successfully" 
    });

  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs"; 