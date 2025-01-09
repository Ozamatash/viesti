import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

// Server-side Supabase instance (uses service role key)
export const supabaseServer = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

export const BUCKET_NAME = "message-attachments";

// Server-side file operations
export async function deleteFile(filePath: string) {
  try {
    const { error } = await supabaseServer.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
} 