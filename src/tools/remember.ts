import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolveScope } from "../identity.js";
import { provenanceLabels } from "../provenance.js";
import { toolClient, type MemoryToolOptions } from "./shared.js";

/**
 * Builds the `remember` tool: persist a fact to the current user's memory.
 * Spectron extracts structured facts from the text; the write is scoped to the
 * user and tagged with eve provenance labels.
 */
export function rememberTool(options?: MemoryToolOptions) {
  return defineTool({
    description:
      "Store a durable fact about the current user in long-term memory (e.g. a stated preference, decision, or detail worth remembering for later conversations).",
    inputSchema: z.object({
      text: z
        .string()
        .describe("The fact to remember, as a clear natural-language statement."),
      labels: z
        .array(z.string())
        .optional()
        .describe('Optional extra `key=value` labels to tag the memory with.'),
    }),
    async execute(input, ctx) {
      const client = toolClient(options);
      const scope = resolveScope(ctx, options?.scope);
      const labels = [
        ...provenanceLabels(ctx, ctx.session.turn?.id),
        ...(input.labels ?? []),
      ];
      const result = await client.remember(input.text, {
        scope,
        role: "user",
        labels,
      });
      return result;
    },
  });
}

/** Ready-made `remember` tool using the shared client and default scope. */
export const remember = rememberTool();
export default remember;
