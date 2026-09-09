/**
 * Post-turn write-back. Observes the durable event stream and persists each
 * user message to AgentMemory with provenance (eve session / turn / agent /
 * channel). AgentMemory extracts structured facts from what it stores.
 */
import { agentMemoryMemoryHook } from "@surrealdb/agent-memory-eve";

export default agentMemoryMemoryHook({
  // Persist user messages (the source of durable facts). Enable assistant
  // replies too if you want the agent's own statements remembered:
  // persist: { user: true, assistant: true },
});
