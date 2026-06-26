import { BrainCircuit } from "lucide-react";
import React from "react";

interface ChatEmptyStateProps {
  userName: string;
}

export function ChatEmptyState({ userName }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-12 px-4 text-center select-none animate-in fade-in duration-500">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 p-4 shadow-[0_0_40px_rgba(139,92,246,0.15)] ring-1 ring-white/5">
        <BrainCircuit className="h-8 w-8 text-violet-400" />
      </div>
      <h1 className="text-2xl font-medium tracking-tight text-zinc-100 mb-2">
        Good Morning, {userName || "Guest"}
      </h1>
      <h2 className="text-xl font-medium tracking-tight text-zinc-400">
        How Can I <span className="text-violet-400 font-semibold">Assist You</span> Today?
      </h2>
    </div>
  );
}
