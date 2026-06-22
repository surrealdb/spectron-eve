/**
 * Post-turn write-back. Observes the durable event stream and persists each
 * user message to Spectron with provenance (eve session / turn / agent /
 * channel). Spectron extracts structured facts from what it stores.
 */
import { spectronMemoryHook } from "@surrealdb/spectron-eve";

export default spectronMemoryHook({
  // Persist user messages (the source of durable facts). Enable assistant
  // replies too if you want the agent's own statements remembered:
  // persist: { user: true, assistant: true },
});
