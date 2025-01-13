import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { env } from "~/env";

export async function POST(req: Request) {
  console.log("Webhook received");
  
  // Test database connection
  try {
    const testQuery = await db.user.findFirst();
    console.log("Database connection test:", { success: true, firstUser: testQuery });
  } catch (err) {
    console.error("Database connection test failed:", err);
  }

  // Get the headers
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  console.log("Headers:", { svix_id, svix_timestamp, svix_signature });

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.log("Missing Svix headers");
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);
  console.log("Webhook payload:", payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(env.WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
    console.log("Webhook verified successfully");
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log("Event type:", eventType);

  if (eventType === "user.created") {
    console.log("Full webhook data:", evt.data);
    
    // Extract user data with fallbacks
    const userData = evt.data;
    const userId = userData.id;
    const userUsername = userData.username ?? userData.email_addresses?.[0]?.email_address;
    const userImage = userData.image_url;
    
    console.log("Extracted user data:", {
      userId,
      userUsername,
      userImage
    });

    try {
      // Create a new user in the database
      const user = await db.user.create({
        data: {
          id: userId,
          username: userUsername || `user${userId.slice(-6)}`, // Fallback username if not provided
          profileImageUrl: userImage,
          status: "Offline",
        },
      });
      console.log("User created in database:", user);

      return new Response("User created", { status: 200 });
    } catch (err) {
      console.error("Error creating user - full error:", err);
      if (err instanceof Error) {
        console.error("Error message:", err.message);
      }
      return new Response("Error creating user", { status: 500 });
    }
  }

  // Handle user deletion
  if (eventType === "user.deleted") {
    console.log("User deleted webhook received:", evt.data);
    const userId = evt.data.id;

    try {
      // Update the user to show as deleted
      await db.user.update({
        where: { id: userId },
        data: {
          username: "Deleted User",
          profileImageUrl: null,
          status: "Offline",
        },
      });

      console.log("Successfully marked user as deleted");
      return new Response("User marked as deleted", { status: 200 });
    } catch (err) {
      console.error("Error marking user as deleted - full error:", err);
      if (err instanceof Error) {
        console.error("Error message:", err.message);
      }
      return new Response("Error marking user as deleted", { status: 500 });
    }
  }

  return new Response("Webhook received", { status: 200 });
} 