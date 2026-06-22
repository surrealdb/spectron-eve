import { defineTool } from "eve/tools";
import { normaliseScope } from "@surrealdb/spectron";
import { z } from "zod";
import { resolveScope } from "../identity.js";
import { toolClient, type MemoryToolOptions } from "./shared.js";

/**
 * Builds the `timeline` tool: tri-temporal recall. Answers "what did we know,
 * and when" by recalling against Spectron with valid-time / as-of bounds — for
 * questions like "what was the user's preference last month?".
 */
export function timelineTool(options?: MemoryToolOptions) {
  return defineTool({
    description:
      "Recall what was known about the current user as of a point in time, or within a valid-time window. Use for historical questions ('what did they prefer back in March?').",
    inputSchema: z.object({
      query: z.string().describe("What to recall, in natural language."),
      asOf: z
        .string()
        .optional()
        .describe("Known/valid-time instant to query as of (ISO 8601)."),
      validFrom: z
        .string()
        .optional()
        .describe("Valid-time lower bound (ISO 8601)."),
      validUntil: z
        .string()
        .optional()
        .describe("Valid-time upper bound (ISO 8601)."),
      k: z.number().int().positive().max(50).optional(),
    }),
    async execute(input, ctx) {
      const client = toolClient(options);
      const lens = normaliseScope(resolveScope(ctx, options?.scope));
      const result = await client.recall(input.query, {
        k: input.k ?? 8,
        lens,
        source: "eve",
        ...(input.asOf ? { asOf: input.asOf } : {}),
        ...(input.validFrom ? { validFrom: input.validFrom } : {}),
        ...(input.validUntil ? { validUntil: input.validUntil } : {}),
      });
      return result;
    },
  });
}

/** Ready-made `timeline` tool using the shared client and default scope. */
export const timeline = timelineTool();
export default timeline;
