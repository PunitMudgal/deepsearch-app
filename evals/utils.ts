import type { UIMessage } from "ai";

import type { EvalCase } from "@/evals/types";

export function getQuestionFromMessages(messages: UIMessage[]): string {
  const userMessage = messages.find((message) => message.role === "user");
  const textPart = userMessage?.parts.find((part) => part.type === "text");

  if (!textPart || textPart.type !== "text") {
    return "";
  }

  return textPart.text;
}

export function evalCase(id: string, text: string, expected: string): EvalCase {
  return {
    input: [
      {
        id,
        role: "user",
        parts: [{ type: "text", text }],
      },
    ],
    expected,
  };
}
