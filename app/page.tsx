import { auth } from "@/server/auth";
import { ChatPage } from "@/app/chat";
import { ChatSidebarLayout } from "@/components/chat-sidebar-layout";

const chats = [
  {
    id: "1",
    title: "My First Chat",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await auth();
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = !!session?.user;

  return (
    <ChatSidebarLayout
      activeChatId={id}
      chats={chats}
      isAuthenticated={isAuthenticated}
      userImage={session?.user?.image}
    >
      <ChatPage
        userName={userName}
        isAuthenticated={isAuthenticated}
        chatId={id}
      />
    </ChatSidebarLayout>
  );
}
