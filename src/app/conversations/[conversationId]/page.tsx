import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { MessageList } from "~/components/message/MessageList";
import { MessageInput } from "~/components/message/MessageInput";
import { WorkspacePanel } from "~/components/workspace/WorkspacePanel";
import { ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { cn } from "~/lib/utils";
import { parseConversationId } from "~/lib/conversation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

interface PageProps {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConversationPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { conversationId } = await props.params;
  const { userId1, userId2 } = parseConversationId(conversationId);

  // Verify that the current user is part of the conversation
  if (userId !== userId1 && userId !== userId2) {
    redirect("/channels");
  }

  // Get the other user's details
  const otherUserId = userId === userId1 ? userId2 : userId1;
  const otherUser = await db.user.findUnique({
    where: { id: otherUserId },
  });

  if (!otherUser) {
    redirect("/channels");
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-screen items-stretch"
    >
      {/* Workspace panel */}
      <ResizablePanel 
        defaultSize={4} 
        minSize={4} 
        maxSize={4}
      >
        <WorkspacePanel />
      </ResizablePanel>

      {/* Main content */}
      <ResizablePanel defaultSize={96} className="bg-background">
        <div className="flex h-full flex-col">
          {/* Conversation header */}
          <div className="border-b p-4 bg-muted/30 flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={otherUser.profileImageUrl ?? undefined} />
                <AvatarFallback>{otherUser.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span 
                className={cn(
                  "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                  otherUser.status === "Online" ? "bg-green-500" : "bg-muted"
                )}
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{otherUser.username}</h1>
              <p className={cn(
                "text-sm",
                otherUser.status === "Online" 
                  ? "text-green-600" 
                  : "text-muted-foreground"
              )}>
                {otherUser.status}
              </p>
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