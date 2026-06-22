import { defineTool } from "eve/tools";
import { normaliseScope } from "@surrealdb/spectron";
import { z } from "zod";
import { resolveScope } from "../identity.js";
import { toolClient, type MemoryToolOptions } from "./shared.js";

/**
 * Builds the `recall` tool: semantic / hybrid retrieval over the calling
 * user's memory. The tool resolves the user scope from the runtime context, so
 * the model only ever asks "what do I remember about X" — never which user.
 */
export function recallTool(options?: MemoryToolOptions) {
  return defineTool({
    description:
      "Recall relevant facts and passages from long-term memory for the current user. Use before answering when prior context (preferences, past decisions, history) would help.",
    inputSchema: z.object({
      query: z.string().describe("What to recall, in natural language."),
      k: z
        .number()
        .int()
        .positive()
        .max(50)
        .optional()
        .describe("Maximum number of memories to return. Default 8."),
    }),
    async execute(input, ctx) {
      const client = toolClient(options);
      const lens = normaliseScope(resolveScope(ctx, options?.scope));
      const result = await client.recall(input.query, {
        k: input.k ?? 8,
        lens,
        source: "eve",
      });
      return result;
    },
  });
}

/** Ready-made `recall` tool using the shared client and default scope. */
export const recall = recallTool();
export default recall;
