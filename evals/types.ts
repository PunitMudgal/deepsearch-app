import type { UIMessage } from "ai";

export type EvalCase = {
  input: UIMessage[];
  expected: string;
};
