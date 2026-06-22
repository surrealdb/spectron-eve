import type { Spectron } from "@surrealdb/spectron";
import { getSharedSpectronClient } from "../client.js";
import type { ResolveScopeOptions } from "../identity.js";

/**
 * Shared options accepted by every memory-tool factory.
 *
 * Omit them to get the defaults: the process-wide shared client (configured
 * from the environment) and the default per-user scope.
 */
export interface MemoryToolOptions {
  /** Spectron client to use. Defaults to the shared, env-configured client. */
  client?: Spectron;
  /** Scope-resolution options controlling how the end-user identity is derived. */
  scope?: ResolveScopeOptions;
}

/**
 * Resolves the client a tool should use, lazily. Call this *inside* `execute`
 * (not at factory-call time) so that merely importing the tool pack never
 * constructs a client — and therefore never throws on missing env vars before
 * the agent actually runs.
 */
export function toolClient(options: MemoryToolOptions | undefined): Spectron {
  return options?.client ?? getSharedSpectronClient();
}
