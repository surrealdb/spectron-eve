import { defineTool } from "eve/tools";
import { z } from "zod";
import { toolClient, type MemoryToolOptions } from "./shared.js";

/**
 * Builds the `entities` tool: read Spectron's knowledge graph. With a `type`
 * and `name` it returns one entity plus its attributes and relations; with just
 * a `type` (or nothing) it lists entities. Lets the model traverse what the
 * agent knows about people, places, and things rather than only flat facts.
 */
export function entitiesTool(options?: MemoryToolOptions) {
  return defineTool({
    description:
      "Look up entities in the knowledge graph. Provide a type and name to get one entity with its attributes and relations, or just a type to list entities of that type.",
    inputSchema: z.object({
      type: z
        .string()
        .optional()
        .describe("Entity type to filter by (e.g. 'person', 'project')."),
      name: z
        .string()
        .optional()
        .describe("Entity name. When set together with `type`, fetches that one entity."),
    }),
    async execute(input) {
      const client = toolClient(options);
      if (input.type && input.name) {
        return await client.entities.get(input.type, input.name);
      }
      return await client.entities.list(
        input.type ? { type: input.type } : undefined,
      );
    },
  });
}

/** Ready-made `entities` tool using the shared client. */
export const entities = entitiesTool();
export default entities;
