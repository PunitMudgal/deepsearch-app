"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUpIcon, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatMessage } from "@/components/chat-message";
import { ErrorMessage } from "@/components/error-message";
import { SignInModal } from "@/components/sign-in-modal";
import { isNewChatCreated } from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {Field} from "@/components/ui/field"

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string | undefined;
  initialMessages: UIMessage[];
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
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
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
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
        </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto min-w-2/3 p-4"
          >



            {/* input field */}
            <Field orientation="horizontal" className="flex gap-2 w-full p-1 px-5 bg-stone-900 rounded-full h-16">
              {/* File upload button */}
<Button variant="outline" className="p-4 h-full text-white hover:text-gray-400 rounded-full">
  <Plus />
</Button>
              <Input
                type="text"
                className="h-full p-4 text-white rounded-full outline-0 border-0 focus:ring-0 focus:ring-offset-0 bg-transparent"
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
                className="p-4 h-full text-white hover:text-gray-400 rounded-full"
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
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
