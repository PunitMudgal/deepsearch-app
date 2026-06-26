import { Loader2, Plus, ArrowUpIcon, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  isAuthenticated,
}: ChatInputProps) {
  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[800px] p-4">
      <div className="relative flex min-h-[60px] w-full items-center gap-2 rounded-2xl bg-[#1e1e24] border border-zinc-800 px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-zinc-700 focus-within:border-zinc-700 transition-all">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Input
          type="text"
          className="flex-1 min-h-[44px] border-0 bg-transparent px-2 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
          value={input}
          onChange={handleInputChange}
          placeholder={
            isAuthenticated
              ? "Initiate a query or send a command to the AI..."
              : "Sign in to chat..."
          }
          autoFocus
          disabled={isLoading}
          aria-label="Chat input"
        />
        <div className="flex shrink-0 items-center gap-1 pr-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-10 w-10 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUpIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
