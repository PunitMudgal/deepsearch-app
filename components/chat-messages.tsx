import { type UIMessage } from "ai";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "@/components/chat-message";
import { ErrorMessage } from "@/components/error-message";
import React from "react";

interface ChatMessagesProps {
  messages: UIMessage[];
  userName: string;
  error?: Error;
}

export function ChatMessages({ messages, userName, error }: ChatMessagesProps) {
  return (
    <StickToBottom
      className="relative flex min-h-0 w-full flex-1 flex-col [&>div]:scrollbar-thin [&>div]:scrollbar-track-transparent [&>div]:scrollbar-thumb-zinc-800 hover:[&>div]:scrollbar-thumb-zinc-700 overflow-hidden"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content
        className="mx-auto w-full max-w-[800px] p-4 flex flex-col gap-6"
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
        {/* Add some padding at the bottom of the list for visual balance before the input */}
        <div className="h-4 w-full shrink-0" />
      </StickToBottom.Content>
    </StickToBottom>
  );
}
