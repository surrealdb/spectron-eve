import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolClient, type MemoryToolOptions } from "./shared.js";

/**
 * Builds the `forget` tool: erase memory matching a natural-language query.
 *
 * Note: the Agent Memory `/forget` endpoint matches by query across the region the
 * API key writes to; it is not narrowed by per-call scope. Phrase the query
 * specifically, and gate this tool behind approval in sensitive deployments
 * (`needsApproval` from `eve/tools/approval`).
 */
export function forgetTool(options?: MemoryToolOptions) {
  return defineTool({
    description:
      "Forget memories matching a natural-language description (e.g. 'the user's old shipping address'). Use when the user asks to be forgotten or to correct stale information.",
    inputSchema: z.object({
      query: z.string().describe("Natural-language description of what to forget."),
      purge: z
        .boolean()
        .optional()
        .describe("Hard-delete instead of tombstoning. Default false."),
    }),
    async execute(input) {
      const client = toolClient(options);
      const result = await client.forget(input.query, {
        purge: input.purge ?? false,
      });
      return result;
    },
  });
}

/** Ready-made `forget` tool using the shared client. */
export const forget = forgetTool();
export default forget;
