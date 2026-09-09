/**
 * @surrealdb/agent-memory-eve — the official Eve adapter for AgentMemory.
 *
 * Gives an eve agent persistent, provenance-tracked memory backed by
 * SurrealDB's AgentMemory memory layer, in two layers:
 *
 * - A tool pack (`@surrealdb/agent-memory-eve/tools`) the model can call.
 * - Auto-memory middleware ({@link agentMemoryMemoryInstructions} +
 *   {@link agentMemoryMemoryHook}) that recalls before a turn and persists after
 *   it, with no tool call required.
 */

// Client + configuration
export {
  createAgentMemoryClient,
  getSharedAgentMemoryClient,
  setSharedAgentMemoryClient,
  AgentMemory,
} from "./client.js";
export {
  resolveAgentMemoryOptions,
  type AgentMemoryConnectionConfig,
} from "./config.js";

// Identity / scope
export {
  resolveScope,
  resolveUserId,
  type ResolveScopeOptions,
  type ScopeContextLike,
  type SessionAuthLike,
  type PrincipalLike,
} from "./identity.js";

// Provenance
export {
  provenanceLabels,
  PROVENANCE_PREFIX,
  type ProvenanceContextLike,
} from "./provenance.js";

// Auto-memory middleware
export {
  agentMemoryMemoryInstructions,
  agentMemoryMemoryHook,
  type AutoMemoryOptions,
  type MemoryInstructionsOptions,
  type MemoryHookOptions,
  type MemoryHit,
} from "./middleware.js";
