import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { ChannelList } from "~/components/channel/ChannelList";
import { MessageList } from "~/components/message/MessageList";
import { MessageInput } from "~/components/message/MessageInput";
import { WorkspacePanel } from "~/components/workspace/WorkspacePanel";
import { ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";

type Props = {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ChannelPage(props: Props) {
  const { userId } = await auth();
  const params = await props.params;

  if (!userId) {
    redirect("/sign-in");
  }

  const channelId = Number(params.channelId);
  if (isNaN(channelId)) {
    redirect("/channels");
  }

  // Fetch channel details
  const channel = await db.channel.findUnique({
    where: { id: channelId },
    include: {
      members: true,
    },
  });

  if (!channel) {
    redirect("/channels");
  }

  // Check if user is a member
  const isMember = channel.members.some((member: { userId: string }) => member.userId === userId);

  if (!isMember && !channel.isPublic) {
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

      {/* Channel list */}
      <ResizablePanel 
        defaultSize={16} 
        minSize={12} 
        maxSize={20} 
        className={cn(
          "bg-muted/50 dark:bg-muted/80",
          "transition-all duration-300 ease-in-out",
          "border-x"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center p-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold">Channels</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-2">
              <ChannelList />
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      {/* Main content */}
      <ResizablePanel defaultSize={80} className="bg-background">
        <div className="flex h-full flex-col">
          {/* Channel header */}
          <div className="border-b p-4 bg-muted/30">
            <h1 className="text-lg font-semibold">#{channel.name}</h1>
            {channel.description && (
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <MessageList channelId={channelId} />
          </div>

          {/* Message input */}
          <div className="flex-shrink-0">
            <MessageInput channelId={channelId} />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 