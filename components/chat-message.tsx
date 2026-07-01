import ReactMarkdown, { type Components } from "react-markdown";
import {
  getToolName,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from "ai";
import { Loader2, Search } from "lucide-react";
import { MessageCopyButton } from "@/components/message-copy-button";
import { ReasoningSteps } from "@/components/reasoning-steps";
import type { OurMessageAnnotation } from "@/lib/agent-annotations";
import { getMessageAnnotations } from "@/lib/agent-annotations";
import { cn } from "@/lib/utils";

export type MessagePart = NonNullable<UIMessage["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
  annotations?: OurMessageAnnotation[];
}

function getMessageCopyText(parts: MessagePart[]): string {
  return parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .filter((text) => text.trim().length > 0)
    .join("\n\n");
}

const components: Components = {
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-zinc-900/80 p-4 ring-1 ring-zinc-800">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-violet-400 underline underline-offset-2 hover:text-violet-300"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

type SearchWebInput = {
  query: string;
};

type SearchWebResult = {
  title: string;
  link: string;
  snippet: string;
  publishedDate: string | null;
};

function SearchWebToolPart({ part }: { part: MessagePart }) {
  if (!isToolUIPart(part)) {
    return null;
  }

  const input = part.input as SearchWebInput | undefined;
  const query = input?.query;

  const isLoading =
    part.state === "input-streaming" || part.state === "input-available";

  const results =
    part.state === "output-available"
      ? (part.output as SearchWebResult[])
      : null;

  return (
    <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 font-medium text-zinc-300">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-violet-400" />
        ) : (
          <Search className="size-4 text-violet-400" />
        )}
        <span>Search Web</span>
      </div>

      {query ? (
        <p className="text-zinc-400">
          {isLoading ? "Searching for" : "Searched for"}:{" "}
          <span className="text-zinc-200">&quot;{query}&quot;</span>
        </p>
      ) : null}

      {results ? (
        <p className="mt-1 text-zinc-500">
          Found {results.length} result{results.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {part.state === "output-error" ? (
        <p className="mt-1 text-red-400">{part.errorText}</p>
      ) : null}
    </div>
  );
}

function MessagePartContent({ part }: { part: MessagePart }) {
  if (part.type === "data-newAction") {
    return null;
  }

  if (isTextUIPart(part)) {
    if (!part.text) {
      return null;
    }

    return (
      <div className="prose prose-invert max-w-none text-[15px] leading-relaxed text-zinc-200">
        <Markdown>{part.text}</Markdown>
      </div>
    );
  }

  if (isToolUIPart(part)) {
    const toolName = getToolName(part);

    if (toolName === "searchWeb") {
      return <SearchWebToolPart part={part} />;
    }

    return (
      <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">
        Called tool: {toolName} ({part.state})
      </div>
    );
  }

  return null;
}

export const ChatMessage = ({
  parts,
  role,
  userName,
  annotations,
}: ChatMessageProps) => {
  const isAI = role === "assistant";
  const copyText = getMessageCopyText(parts);
  const hasCopyableText = copyText.trim().length > 0;
  const actionAnnotations = isAI
    ? (annotations ?? getMessageAnnotations(parts))
    : [];

  return (
    <article
      className={cn(
        "group w-full",
        isAI ? "pr-4" : "flex flex-col items-end pl-8",
      )}
    >
      <div
        className={cn(
          "relative rounded-2xl px-4 py-3 transition-colors",
          isAI
            ? "bg-transparent"
            : "max-w-[85%] bg-zinc-800/60 ring-1 ring-zinc-800/80",
        )}
      >
        <p className="mb-2 text-xs font-medium text-zinc-500">
          {isAI ? "DeepSearch" : userName}
        </p>

        {isAI ? <ReasoningSteps annotations={actionAnnotations} /> : null}

        <div className="space-y-1">
          {parts.map((part, index) => (
            <MessagePartContent key={`${part.type}-${index}`} part={part} />
          ))}
        </div>
      </div>

      {hasCopyableText ? (
        <div
          className={cn(
            "mt-1 flex h-8 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
            isAI ? "justify-start" : "justify-end pr-1",
          )}
        >
          <MessageCopyButton text={copyText} />
        </div>
      ) : null}
    </article>
  );
};
