import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChannelList } from "~/components/channel/ChannelList";
import { UserList } from "~/components/users/UserList";

export default async function ChannelsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Channels</h2>
          <UserList />
        </div>
        <ChannelList />
      </div>

      {/* Main content */}
      <div className="flex-1 bg-white p-4">
        <h1 className="text-2xl font-bold">Welcome to Viesti</h1>
        <p className="text-gray-600">Select a channel to start chatting</p>
      </div>
    </div>
  );
} 