/**
 * @surrealdb/spectron-eve — the official Eve adapter for Spectron.
 *
 * Gives an eve agent persistent, provenance-tracked memory backed by
 * SurrealDB's Spectron memory layer, in two layers:
 *
 * - A tool pack (`@surrealdb/spectron-eve/tools`) the model can call.
 * - Auto-memory middleware ({@link spectronMemoryInstructions} +
 *   {@link spectronMemoryHook}) that recalls before a turn and persists after
 *   it, with no tool call required.
 */

// Client + configuration
export {
  createSpectronClient,
  getSharedSpectronClient,
  setSharedSpectronClient,
  Spectron,
} from "./client.js";
export {
  resolveSpectronOptions,
  type SpectronConnectionConfig,
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
  spectronMemoryInstructions,
  spectronMemoryHook,
  type AutoMemoryOptions,
  type MemoryInstructionsOptions,
  type MemoryHookOptions,
  type MemoryHit,
} from "./middleware.js";
