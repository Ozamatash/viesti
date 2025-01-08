import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

// Client-side Supabase instance (uses public anon key)
export const supabaseClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

export const BUCKET_NAME = "message-attachments";

// Client-side file upload
export async function uploadFile(file: File, userId: string) {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      filename: file.name,
      filetype: file.type,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
} 