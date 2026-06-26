import { type UIMessage } from "ai";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "@/components/chat-message";
import { ErrorMessage } from "@/components/error-message";
import { ScrollToBottomButton } from "@/components/scroll-to-bottom-button";

interface ChatMessagesProps {
  messages: UIMessage[];
  userName: string;
  error?: Error;
}

export function ChatMessages({ messages, userName, error }: ChatMessagesProps) {
  return (
    <StickToBottom
      className="relative h-full min-h-0 w-full [&>div]:h-full [&>div]:min-h-0"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content
        scrollClassName="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-700"
        className="mx-auto flex w-full max-w-[800px] flex-col gap-6 p-4"
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

        <div className="h-2 w-full shrink-0" />
      </StickToBottom.Content>

      <ScrollToBottomButton />
    </StickToBottom>
  );
}
