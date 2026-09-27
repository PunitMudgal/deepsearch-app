"use client";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-lg font-semibold text-zinc-200">
        Something went wrong
      </h2>
      <p className="max-w-md text-center text-sm text-zinc-400">
        {error.message || "An unexpected error occurred during chat."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-700"
      >
        Try again
      </button>
    </div>
  );
}
