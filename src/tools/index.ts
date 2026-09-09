/**
 * The AgentMemory tool pack for eve.
 *
 * Each export is a ready-to-use `defineTool` definition. Expose one in an eve
 * agent by re-exporting it as the default of a file in `agent/tools/`, where
 * the filename becomes the tool name:
 *
 * ```ts
 * // agent/tools/recall.ts
 * export { recall as default } from "@surrealdb/agent-memory-eve/tools";
 * ```
 *
 * For custom configuration (a specific client, or a non-default user scope),
 * use {@link createMemoryTools} or the individual `*Tool` factories.
 */
export { recall, recallTool } from "./recall.js";
export { remember, rememberTool } from "./remember.js";
export { forget, forgetTool } from "./forget.js";
export { entities, entitiesTool } from "./entities.js";
export { timeline, timelineTool } from "./timeline.js";
export type { MemoryToolOptions } from "./shared.js";

import { recallTool } from "./recall.js";
import { rememberTool } from "./remember.js";
import { forgetTool } from "./forget.js";
import { entitiesTool } from "./entities.js";
import { timelineTool } from "./timeline.js";
import type { MemoryToolOptions } from "./shared.js";

/**
 * Builds the full AgentMemory tool set with shared options (client + scope).
 * Re-export the entries you want from `agent/tools/*.ts`:
 *
 * ```ts
 * // agent/tools/memory.ts is NOT how eve names tools — one file per tool:
 * // agent/tools/recall.ts
 * import { createMemoryTools } from "@surrealdb/agent-memory-eve/tools";
 * export default createMemoryTools({ scope: { includeChannel: true } }).recall;
 * ```
 */
export function createMemoryTools(options?: MemoryToolOptions) {
  return {
    recall: recallTool(options),
    remember: rememberTool(options),
    forget: forgetTool(options),
    entities: entitiesTool(options),
    timeline: timelineTool(options),
  };
}
