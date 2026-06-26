"use client";

import Image from "next/image";
import { getGreeting } from "@/lib/chat-greetings";

interface ChatEmptyStateProps {
  userName: string;
  chatId: string;
}

function GreetingSubtitle({
  before,
  highlight,
  after,
}: {
  before: string;
  highlight: string;
  after: string;
}) {
  return (
    <>
      {before}
      <span className="font-semibold text-violet-400">{highlight}</span>
      {after}
    </>
  );
}

export function ChatEmptyState({ userName, chatId }: ChatEmptyStateProps) {
  const greeting = getGreeting(chatId, userName);

  return (
    <div className="flex flex-col items-center justify-center px-4 pb-12 pt-8 text-center select-none duration-500 animate-in fade-in">
      <div className="mb-6 flex items-center justify-center rounded-2xl p-4">
        <Image src="/logo-white.png" alt="DeepSearch" width={72} height={72} />
      </div>
      <h1 className="mb-2 text-4xl font-medium tracking-tight text-zinc-100">
        {greeting.title}
      </h1>
      <h2 className="text-xl font-medium tracking-tight text-zinc-400">
        <GreetingSubtitle {...greeting.subtitle} />
      </h2>
    </div>
  );
}
