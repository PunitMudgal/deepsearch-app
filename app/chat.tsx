"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInModal } from "@/components/sign-in-modal";
import { isNewChatCreated } from "@/lib/chat";
import { ChatInput } from "@/components/chat-input";
import { ChatEmptyState } from "@/components/chat-empty-state";
import { ChatMessages } from "@/components/chat-messages";
import { CHAT_PARTICLE_COLORS } from "@/components/particles";

const Particles = dynamic(
  () => import("@/components/particles").then((mod) => mod.Particles),
  { ssr: false },
);

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
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#0b0b0d]">
        {messages.length === 0 ? (
          <>
            <div className="pointer-events-none absolute inset-0 z-0">
              <Particles
                particleColors={CHAT_PARTICLE_COLORS}
                particleCount={320}
                particleSpread={12}
                speed={0.1}
                particleBaseSize={160}
                moveParticlesOnHover={false}
                alphaParticles
                sizeRandomness={1}
                cameraDistance={16}
                pixelRatio={1.5}
              />
              <div className="absolute inset-0 bg-[#0b0b0d]/50" />
            </div>

            <div className="relative z-10 flex h-full w-full flex-1 flex-col items-center justify-center px-4">
              <ChatEmptyState userName={userName} chatId={chatId} />
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
          </>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 w-full flex-1">
              <ChatMessages
                messages={messages}
                userName={userName}
                error={error}
              />
            </div>
            <div className="relative z-10 w-full shrink-0 border-t border-zinc-800/50 bg-[#0b0b0d] px-4 pb-4 pt-2">
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
