import { defineAgent } from "eve";

/**
 * A memory-powered assistant.
 *
 * Memory is wired up by the sibling files, not here:
 * - `instructions/memory.ts` recalls + injects relevant memory each turn.
 * - `hooks/memory.ts` persists the conversation back to Spectron.
 * - `tools/*.ts` expose the Spectron tool pack for explicit recall/remember.
 *
 * Set SPECTRON_CONTEXT / SPECTRON_API_KEY / SPECTRON_ENDPOINT in the
 * environment (see `.env.example`).
 */
export default defineAgent({
  model: "openai/gpt-5.4-mini",
});
