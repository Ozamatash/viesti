import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChannelList } from "~/components/channel/ChannelList";
import { UserList } from "~/components/users/UserList";
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
      className="h-screen items-stretch"
    >
      {/* Sidebar */}
      <ResizablePanel 
        defaultSize={20} 
        minSize={15} 
        maxSize={30} 
        className={cn(
          "bg-muted/50 dark:bg-muted/80",
          "transition-all duration-300 ease-in-out"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Channels</h2>
            <UserList />
          </div>
          <ScrollArea className="flex-1 px-2">
            <div className="py-2">
              <ChannelList />
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      {/* Main content */}
      <ResizablePanel defaultSize={80} className="bg-background">
        <div className="flex h-full flex-col items-center justify-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome to Viesti</h1>
          <p className="text-muted-foreground">Select a channel to start chatting</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 