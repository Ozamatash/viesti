import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { MessageList } from "~/components/message/MessageList";
import { MessageInput } from "~/components/message/MessageInput";
import { WorkspacePanel } from "~/components/workspace/WorkspacePanel";
import { ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { DMRecap } from "~/components/dm/DMRecap";
import { User, UserStatus } from "~/types";
import { Prisma } from "@prisma/client";
import { parseConversationId } from "~/lib/conversation";

interface PageProps {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

type DirectMessageWithUsers = Prisma.DirectMessageGetPayload<{
  include: {
    sender: true;
    receiver: true;
  };
}>;

export default async function ConversationPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const { userId } = await auth();
  const { conversationId } = await props.params;

  if (!userId) {
    redirect("/sign-in");
  }

  // Parse conversation ID to get both user IDs
  const { userId1, userId2 } = parseConversationId(conversationId);
  const otherUserId = userId === userId1 ? userId2 : userId1;

  // Get the other user's info
  const otherUserData = await db.user.findUnique({
    where: { id: otherUserId }
  });

  if (!otherUserData) {
    redirect("/conversations");
  }

  // Convert Prisma User to our User type
  const user: User = {
    id: otherUserData.id,
    username: otherUserData.username,
    profileImageUrl: otherUserData.profileImageUrl,
    status: otherUserData.status === 'Online' ? UserStatus.Online : UserStatus.Offline,
    lastSeen: otherUserData.lastSeen || undefined
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full items-stretch"
    >
      {/* Workspace panel */}
      <ResizablePanel 
        defaultSize={4} 
        minSize={4} 
        maxSize={4}
        className="h-full"
      >
        <WorkspacePanel />
      </ResizablePanel>

      {/* Main content */}
      <ResizablePanel defaultSize={96} className="bg-background">
        <div className="flex h-full flex-col">
          {/* Conversation header */}
          <div className="border-b p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profileImageUrl ?? undefined} />
                    <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span 
                    className={cn(
                      "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                      user.status === UserStatus.Online ? "bg-green-500" : "bg-muted"
                    )}
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">{user.username}</h1>
                  <p className={cn(
                    "text-sm",
                    user.status === UserStatus.Online 
                      ? "text-green-600" 
                      : "text-muted-foreground"
                  )}>
                    {user.status}
                  </p>
                </div>
              </div>
              <DMRecap 
                conversationId={conversationId} 
                participantName={user.username} 
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <MessageList conversationId={conversationId} />
          </div>

          {/* Message input */}
          <div className="flex-shrink-0">
            <MessageInput conversationId={conversationId} />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 