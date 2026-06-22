import ReactMarkdown, { type Components } from "react-markdown";
import {
  getToolName,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from "ai";
import { Loader2, Search } from "lucide-react";

export type MessagePart = NonNullable<UIMessage["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
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
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
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
    <div className="mb-3 rounded-lg border border-gray-600 bg-gray-700/40 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 font-medium text-gray-300">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-blue-400" />
        ) : (
          <Search className="size-4 text-blue-400" />
        )}
        <span>Search Web</span>
      </div>

      {query ? (
        <p className="text-gray-400">
          {isLoading ? "Searching for" : "Searched for"}:{" "}
          <span className="text-gray-300">&quot;{query}&quot;</span>
        </p>
      ) : null}

      {results ? (
        <p className="mt-1 text-gray-400">
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
  if (isTextUIPart(part)) {
    if (!part.text) {
      return null;
    }

    return (
      <div className="prose prose-invert max-w-none">
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
      <div className="mb-3 rounded-lg border border-gray-600 bg-gray-700/40 p-3 text-sm text-gray-400">
        Called tool: {toolName} ({part.state})
      </div>
    );
  }

  return null;
}

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        <div className="space-y-1">
          {parts.map((part, index) => (
            <MessagePartContent key={`${part.type}-${index}`} part={part} />
          ))}
        </div>
      </div>
    </div>
  );
};
