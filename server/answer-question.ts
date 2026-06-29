import { generateText } from "ai";

import { model } from "@/models";
import { getSystemPrompt } from "@/server/deep-search";
import type { SystemContext } from "@/server/system-context";

export async function answerQuestion(
  context: SystemContext,
  opts: { isFinal?: boolean } = {},
) {
  const finalNote = opts.isFinal
    ? `We may not have all the information we need to answer the question, but we need to make our best effort based on the research gathered so far.

`
    : "";

  const queryHistory = context.getQueryHistory();
  const scrapeHistory = context.getScrapeHistory();

  const result = await generateText({
    model,
    system: getSystemPrompt(),
    prompt: `${finalNote}User question:
${context.getInitialQuestion()}

Research context:

${queryHistory || "No searches yet."}

${scrapeHistory || "No scrapes yet."}

Answer the user's question based on the research context above. When citing sources, always use markdown links [title](url), never bare URLs. If search/scrape returned nothing useful, say so instead of guessing.`,
  });

  return result.text;
}
