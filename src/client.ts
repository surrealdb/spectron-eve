import { AgentMemory } from "@surrealdb/memory";
import { resolveAgentMemoryOptions, type AgentMemoryConnectionConfig } from "./config.js";

/**
 * Creates a AgentMemory client from explicit config and/or environment variables.
 *
 * @see {@link AgentMemoryConnectionConfig} for the accepted settings.
 */
export function createAgentMemoryClient(config?: AgentMemoryConnectionConfig): AgentMemory {
  return new AgentMemory(resolveAgentMemoryOptions(config));
}

let shared: AgentMemory | undefined;

/**
 * Returns a process-wide shared AgentMemory client, constructed lazily from the
 * environment on first use. The tool pack and auto-memory hooks use this so a
 * single agent process reuses one client (and its retry/idempotency state).
 *
 * Prefer {@link createAgentMemoryClient} when you need an explicitly-configured
 * client (e.g. a second context, or per-request overrides).
 */
export function getSharedAgentMemoryClient(): AgentMemory {
  if (!shared) {
    shared = createAgentMemoryClient();
  }
  return shared;
}

/**
 * Replaces the process-wide shared client. Intended for tests (inject a client
 * built with a mock `fetchImpl`) and for advanced setups that configure the
 * client once at startup.
 */
export function setSharedAgentMemoryClient(client: AgentMemory): void {
  shared = client;
}

export { AgentMemory };
