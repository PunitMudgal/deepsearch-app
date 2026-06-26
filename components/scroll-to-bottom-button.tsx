"use client";

import { ArrowDown } from "lucide-react";
import { useStickToBottomContext } from "use-stick-to-bottom";

export function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => scrollToBottom()}
      className="absolute bottom-4 left-1/2 z-20 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-700/80 text-zinc-100 shadow-lg backdrop-blur-md transition hover:border-zinc-600 hover:bg-zinc-700 hover:text-white bg-transparent"
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="size-4" />
    </button>
  );
}
