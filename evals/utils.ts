import type { EvalCase } from "@/evals/types";

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
