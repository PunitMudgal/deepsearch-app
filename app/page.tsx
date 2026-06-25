import type { UIMessage } from "ai";
import { auth } from "@/server/auth";
import { getChat, getChats } from "@/server/chat";
import { ChatPage } from "@/app/chat";
import { ChatSidebarLayout } from "@/components/chat-sidebar-layout";

function mapMessagesForChat(dbMessages: UIMessage[] | undefined): UIMessage[] {
  return (
    dbMessages?.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: msg.parts as UIMessage["parts"],
    })) ?? []
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await auth();
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = !!session?.user;

  const chats = session?.user
    ? await getChats({ userId: session.user.id })
    : [];

  const chat =
    id && session?.user
      ? await getChat({ userId: session.user.id, chatId: id })
      : null;

  const initialMessages = mapMessagesForChat(chat?.messages);

  return (
    <ChatSidebarLayout
      activeChatId={id}
      chats={chats}
      isAuthenticated={isAuthenticated}
      userImage={session?.user?.image}
    >
      <ChatPage
        key={id ?? "new"}
        userName={userName}
        isAuthenticated={isAuthenticated}
        chatId={id}
        initialMessages={initialMessages}
      />
    </ChatSidebarLayout>
  );
}
