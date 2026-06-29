"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Link, Search } from "lucide-react";

import type { OurMessageAnnotation } from "@/lib/agent-annotations";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
};

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown components={markdownComponents}>{children}</ReactMarkdown>
  );
}

export function ReasoningSteps({
  annotations,
}: {
  annotations: OurMessageAnnotation[];
}) {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (annotations.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {annotations.map((annotation, index) => {
          const isOpen = openStep === index;

          return (
            <li key={index} className="relative">
              <button
                type="button"
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={`flex w-full min-w-34 shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isOpen
                      ? "border-violet-400 text-white"
                      : "border-zinc-600 bg-zinc-900 text-zinc-300"
                  }`}
                >
                  {index + 1}
                </span>
                {annotation.action.title}
              </button>

              {isOpen ? (
                <div className="mt-1 px-2 py-1">
                  <div className="text-sm italic text-zinc-400">
                    <Markdown>{annotation.action.reasoning}</Markdown>
                  </div>

                  {annotation.action.type === "search" && annotation.action.query ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                      <Search className="size-4 shrink-0" />
                      <span>{annotation.action.query}</span>
                    </div>
                  ) : null}

                  {annotation.action.type === "scrape" && annotation.action.urls ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                      <Link className="size-4 shrink-0" />
                      <span>
                        {annotation.action.urls
                          .map((url) => new URL(url).hostname)
                          .join(", ")}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
