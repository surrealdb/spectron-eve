/**
 * Post-turn write-back. Observes the durable event stream and persists each
 * user message to Agent Memory with provenance (eve session / turn / agent /
 * channel). Agent Memory extracts structured facts from what it stores.
 */
import { agentMemoryHook } from "@surrealdb/agent-memory-eve";

export default agentMemoryHook({
  // Persist user messages (the source of durable facts). Enable assistant
  // replies too if you want the agent's own statements remembered:
  // persist: { user: true, assistant: true },
});
