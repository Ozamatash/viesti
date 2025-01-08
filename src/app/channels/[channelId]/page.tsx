import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { ChannelList } from "~/components/channel/ChannelList";
import { MessageList } from "~/components/message/MessageList";
import { MessageInput } from "~/components/message/MessageInput";
import { UserList } from "~/components/users/UserList";

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
      <div className="flex-1 flex flex-col bg-white">
        {/* Channel header */}
        <div className="border-b p-4">
          <h1 className="text-xl font-bold">#{channel.name}</h1>
          {channel.description && (
            <p className="text-gray-600">{channel.description}</p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <MessageList channelId={channelId} />
        </div>

        {/* Message input */}
        <div className="border-t p-4">
          <MessageInput channelId={channelId} />
        </div>
      </div>
    </div>
  );
} 