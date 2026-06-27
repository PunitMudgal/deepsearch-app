import { ciData } from "@/evals/ci";
import { devData } from "@/evals/dev";
import { regressionData } from "@/evals/regression";
import type { EvalCase } from "@/evals/types";
import { env } from "@/env";

export function resolveEvalData(): EvalCase[] {
  const data = [...devData];

  if (env.EVAL_DATASET === "ci") {
    data.push(...ciData);
  } else if (env.EVAL_DATASET === "regression") {
    data.push(...ciData, ...regressionData);
  }

  return data;
}
