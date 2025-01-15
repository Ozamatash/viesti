import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { WorkspacePanel } from "~/components/workspace/WorkspacePanel";
import { ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";

export default async function ConversationsPage() {
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

      {/* Main content */}
      <ResizablePanel defaultSize={96} className="bg-background">
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <p>Select a conversation from the sidebar to start chatting</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 