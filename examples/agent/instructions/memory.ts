/**
 * Pre-turn recall + inject. Each turn, this resolver recalls memory relevant to
 * the user's latest message (scoped to that user) and lowers it to a system
 * message — so the model "already knows" without calling a tool.
 */
import { spectronMemoryInstructions } from "@surrealdb/spectron-eve";

export default spectronMemoryInstructions({
  topK: 8,
  // Unify memory across channels by default. To scope per channel instead:
  // scope: { includeChannel: true },
});
