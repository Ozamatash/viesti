import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadFile } from "~/lib/supabase-client";
import { 
  ApiError,
  ErrorCode,
  HttpStatus,
  FileUploadRequest,
  FileUploadResponse
} from "~/types";

// Constants for file validation
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      const error: ApiError = {
        code: ErrorCode.AUTHENTICATION_ERROR,
        message: "Authentication required",
      };
      return NextResponse.json({ error }, { status: HttpStatus.UNAUTHORIZED });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as FileUploadRequest["type"] || "message";

    if (!file) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "No file provided",
        details: { field: "file" }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "File type not allowed",
        details: { 
          field: "file",
          type: file.type,
          allowedTypes: ALLOWED_TYPES
        }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const error: ApiError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: "File too large (max 5MB)",
        details: { 
          field: "file",
          size: file.size,
          maxSize: MAX_FILE_SIZE
        }
      };
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST });
    }

    const uploadResult = await uploadFile(file, userId);
    
    const response: FileUploadResponse = {
      data: {
        url: uploadResult.url,
        filename: file.name,
        filetype: file.type
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response, { status: HttpStatus.CREATED });
  } catch (error) {
    console.error("[FILE_UPLOAD]", error);
    const apiError: ApiError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Failed to upload file",
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    };
    return NextResponse.json({ error: apiError }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
} 