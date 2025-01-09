"use client";

import { WorkspacePanel } from "~/components/workspace/WorkspacePanel";
import { ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";
import { cn } from "~/lib/utils";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
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
        <ResizablePanel defaultSize={96}>
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 