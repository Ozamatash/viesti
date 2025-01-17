import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChannelList } from "~/components/channel/ChannelList";
import { WorkspacePanel } from "~/components/workspace/WorkspacePanel";
import { ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";

export default async function ChannelsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

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

      {/* Channel list */}
      <ResizablePanel 
        defaultSize={16} 
        minSize={12} 
        maxSize={20} 
        className={cn(
          "h-full",
          "bg-muted/50 dark:bg-muted/80",
          "transition-all duration-300 ease-in-out",
          "border-x"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex-shrink-0 flex items-center p-4 border-b bg-muted/30">
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
      <ResizablePanel defaultSize={80} className="h-full bg-background">
        <div className="flex h-full flex-col items-center justify-center space-y-6 p-6">
          <h1 className="text-2xl font-bold">Welcome to Viesti</h1>
          <p className="text-muted-foreground">Select a channel to start chatting</p>
          
          <div className="max-w-2xl rounded-lg border bg-muted/10 p-6">
            <h2 className="text-lg font-semibold mb-4">Demo Environment</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                This is a demo environment populated with generated test data. The users and messages you see are created by a seeding script to demonstrate the application's functionality.
              </p>
              <div>
                <strong className="text-foreground">Limitations:</strong>
                <ul className="list-disc pl-6 mt-1">
                  <li>Direct messages don't work with demo users</li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground">AI Features:</strong>
                <ul className="list-disc pl-6 mt-1">
                  <li>Channel Recap: Located on the top right. Get an AI-generated summary of recent conversations</li>
                  <li>Thread Recap: Located inside a thread. Get an AI-generated summary of a thread</li>
                  <li>DM Recap: Located on the top right. Get an AI-generated summary of recent direct messages</li>
                  <li>Intelligent Search: Use natural language to search for messages and get AI answers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 