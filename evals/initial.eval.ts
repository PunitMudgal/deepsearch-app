import type { UIMessage } from "ai";
import { evalite } from "evalite";
import { askDeepSearch } from "@/server/deep-search";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: UIMessage[] }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            parts: [
              {
                type: "text",
                text: "What is the latest version of TypeScript?",
              },
            ],
          },
        ],
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            parts: [
              {
                type: "text",
                text: "What are the main features of Next.js 16?",
              },
            ],
          },
        ],
      },
    ];
  },
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
  ],
});
