import type { UIMessage } from "ai";
import { generateObject } from "ai";
import { createScorer } from "evalite";
import { z } from "zod";

import {
  ANSWER_RELEVANCY_AGENT_INSTRUCTIONS,
  generateEvaluatePrompt,
  generateEvaluationStatementsPrompt,
} from "@/evals/scorers/answer-relevancy-prompts";
import { getQuestionFromMessages } from "@/evals/utils";
import { secondaryModel } from "@/models";

const verdictSchema = z.object({
  verdict: z.enum(["yes", "no", "unsure"]),
  reason: z.string(),
});

const verdictScores = {
  yes: 1,
  no: 0,
  unsure: 0.5,
} as const;

function averageVerdictScore(
  verdicts: Array<z.infer<typeof verdictSchema>>,
): number {
  if (verdicts.length === 0) {
    return 0;
  }

  const total = verdicts.reduce(
    (sum, { verdict }) => sum + verdictScores[verdict],
    0,
  );

  return total / verdicts.length;
}

export async function checkAnswerRelevancy(opts: {
  question: string;
  submission: string;
}) {
  if (!opts.submission.trim()) {
    return {
      score: 0,
      metadata: {
        statements: [],
        verdicts: [],
      },
    };
  }

  const { object: statementsResult } = await generateObject({
    model: secondaryModel,
    prompt: generateEvaluationStatementsPrompt({ output: opts.submission }),
    schema: z.object({
      statements: z.array(z.string()),
    }),
  });

  const statements =
    statementsResult.statements.length > 0
      ? statementsResult.statements
      : [opts.submission];

  const { object: evaluationResult } = await generateObject({
    model: secondaryModel,
    system: ANSWER_RELEVANCY_AGENT_INSTRUCTIONS,
    prompt: generateEvaluatePrompt({
      input: opts.question,
      statements,
    }),
    schema: z.object({
      verdicts: z.array(verdictSchema),
    }),
  });

  const verdicts =
    evaluationResult.verdicts.length === statements.length
      ? evaluationResult.verdicts
      : evaluationResult.verdicts.slice(0, statements.length);

  return {
    score: averageVerdictScore(verdicts),
    metadata: {
      statements,
      verdicts,
    },
  };
}

export const AnswerRelevancy = createScorer<UIMessage[], string, string>({
  name: "Answer Relevancy",
  description:
    "Measures how relevant each statement in the answer is to the question asked.",
  scorer: async ({ input, output }) => {
    return checkAnswerRelevancy({
      question: getQuestionFromMessages(input),
      submission: output,
    });
  },
});
