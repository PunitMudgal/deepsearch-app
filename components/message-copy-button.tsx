"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MessageCopyButtonProps {
  text: string;
  className?: string;
}

export function MessageCopyButton({ text, className }: MessageCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!text.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!text.trim()}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border border-transparent text-zinc-500 transition-all hover:border-zinc-700/80 hover:bg-zinc-800/80 hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-30",
            copied && "border-zinc-700/80 bg-zinc-800/80 text-emerald-400",
            className,
          )}
          aria-label={copied ? "Copied" : "Copy message"}
        >
          {copied ? (
            <Check className="size-3.5" strokeWidth={2.5} />
          ) : (
            <Copy className="size-3.5" strokeWidth={2} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{copied ? "Copied!" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}
