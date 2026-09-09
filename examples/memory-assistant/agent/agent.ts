import { defineAgent } from "eve";

/**
 * A memory-powered assistant.
 *
 * Memory is wired up by the sibling files, not here:
 * - `instructions/memory.ts` recalls + injects relevant memory each turn.
 * - `hooks/memory.ts` persists the conversation back to Agent Memory.
 * - `tools/*.ts` expose the Agent Memory tool pack for explicit recall/remember.
 *
 * Set AGENT_MEMORY_CONTEXT / AGENT_MEMORY_API_KEY / AGENT_MEMORY_ENDPOINT in the
 * environment (see `.env.example`).
 */
export default defineAgent({
  model: "openai/gpt-5.4-mini",
});
