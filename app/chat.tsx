"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInModal } from "@/components/sign-in-modal";
import { isNewChatCreated } from "@/lib/chat";
import { ChatInput } from "@/components/chat-input";
import { ChatEmptyState } from "@/components/chat-empty-state";
import { ChatMessages } from "@/components/chat-messages";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string;
  isNewChat: boolean;
  initialMessages: UIMessage[];
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  isNewChat,
  initialMessages,
}: ChatProps) => {
  const router = useRouter();
  const [data, setData] = useState<unknown[]>([]);
  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        chatId,
        isNewChat,
      },
    }),
    onData: (dataPart) => {
      if (dataPart.type === "data-newChatCreated") {
        setData((previous) => [...previous, dataPart.data]);
      }
    },
  });
  const [input, setInput] = useState("");
  const [showSignInModal, setShowSignInModal] = useState(false);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    const lastDataItem = data[data.length - 1];

    if (isNewChatCreated(lastDataItem)) {
      router.push(`?id=${lastDataItem.chatId}`);
    }
  }, [data, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    sendMessage({ text: input });
    setInput("");
  };

  return (
    <>
      <div className="flex flex-1 flex-col w-full h-full bg-[#0b0b0d] overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 w-full h-full">
            <ChatEmptyState userName={userName} />
            <div className="w-full">
              <ChatInput
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col h-full overflow-hidden relative">
            <div className="flex-1 min-h-0 w-full overflow-hidden">
              <ChatMessages
                messages={messages}
                userName={userName}
                error={error}
              />
            </div>
            <div className="shrink-0 w-full bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/95 to-transparent pt-6 pb-4 px-4 relative z-10">
              <ChatInput
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        )}
      </div>
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
