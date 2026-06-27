import { evalite } from "evalite";
import { AnswerRelevancy } from "@/evals/scorers/answer-relevancy";
import { Factuality } from "@/evals/scorers/factuality";
import { resolveEvalData } from "@/evals/resolve-data";
import { askDeepSearch } from "@/server/deep-search";

evalite("Deep Search Eval", {
  data: async () => resolveEvalData(),
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks =
          typeof output === "string" && markdownLinkPattern.test(output);

        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
    AnswerRelevancy,
  ],
});