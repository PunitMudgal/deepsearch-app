"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUpIcon, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "@/components/chat-message";
import { ErrorMessage } from "@/components/error-message";
import { SignInModal } from "@/components/sign-in-modal";
import { isNewChatCreated } from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
      <div className="flex flex-1 flex-col w-full bg-stone-950">
        <StickToBottom
          className="relative mx-auto flex min-h-0 w-full max-w-[65ch] flex-1 flex-col [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 hover:[&>div]:scrollbar-thumb-gray-500"
          resize="smooth"
          initial="smooth"
        >
          <StickToBottom.Content
            className="p-4"
            role="log"
            aria-label="Chat messages"
          >
            {error ? <ErrorMessage message={error.message} /> : null}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                parts={message.parts}
                role={message.role}
                userName={userName}
              />
            ))}
          </StickToBottom.Content>

          <form onSubmit={handleSubmit} className="mx-auto min-w-2/3 p-4">
            <Field
              orientation="horizontal"
              className="flex h-16 w-full gap-2 rounded-full bg-stone-900 p-1 px-5  "
            >
              <Button
                variant="outline"
                className="h-full rounded-full p-4 text-white hover:text-gray-400"
              >
                <Plus />
              </Button>
              <Input
                type="text"
                className="h-full rounded-full border-0 bg-transparent p-4 text-white outline-0 focus:ring-0 focus:ring-offset-0"
                value={input}
                onChange={handleInputChange}
                placeholder={
                  isAuthenticated ? "Ask Anything..." : "Sign in to chat..."
                }
                autoFocus
                disabled={isLoading}
                aria-label="Chat input"
              />
              <Button
                variant="outline"
                className="h-full rounded-full p-4 text-white hover:text-gray-400"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArrowUpIcon />
                )}
              </Button>
            </Field>
          </form>
        </StickToBottom>
      </div>
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
