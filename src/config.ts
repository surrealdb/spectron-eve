import type { AgentMemoryOptions } from "@surrealdb/memory";

/**
 * Connection settings for the Agent Memory client.
 *
 * Every field can be supplied explicitly or resolved from the environment:
 * - `context`  ← `AGENT_MEMORY_CONTEXT`
 * - `apiKey`   ← `AGENT_MEMORY_API_KEY`
 * - `endpoint` ← `AGENT_MEMORY_ENDPOINT`
 *
 * On Vercel, set these as project environment variables / secrets. The
 * Agent Memory API key is a static bearer token, so it does not need Vercel
 * Connect's interactive OAuth machinery — a plain env var is the simplest
 * path. (For per-tool credential rotation you can still wire a Connect-backed
 * `auth` strategy on the individual tools.)
 */
export interface AgentMemoryConnectionConfig {
  /** Agent Memory context id (the memory store this agent reads/writes). */
  context?: string;
  /** Agent Memory API key sent as an `Authorization: Bearer` token. */
  apiKey?: string;
  /** Agent Memory API origin, without trailing slash. */
  endpoint?: string;
  /** Request timeout in milliseconds. Defaults to the SDK default (30s). */
  timeout?: number;
  /** Maximum retry attempts for idempotent requests. */
  maxRetries?: number;
  /** Override `fetch` (tests / custom stacks). */
  fetchImpl?: typeof fetch;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/**
 * Resolves a partial {@link AgentMemoryConnectionConfig} into the concrete
 * {@link AgentMemoryOptions} the SDK constructor requires, filling gaps from the
 * environment. Throws a descriptive error when a required field is missing so
 * misconfiguration surfaces at startup rather than on the first memory call.
 */
export function resolveAgentMemoryOptions(
  config: AgentMemoryConnectionConfig = {},
): AgentMemoryOptions {
  const context = config.context ?? readEnv("AGENT_MEMORY_CONTEXT");
  const apiKey = config.apiKey ?? readEnv("AGENT_MEMORY_API_KEY");
  const endpoint = config.endpoint ?? readEnv("AGENT_MEMORY_ENDPOINT");

  const missing: string[] = [];
  if (!context) missing.push("context (AGENT_MEMORY_CONTEXT)");
  if (!apiKey) missing.push("apiKey (AGENT_MEMORY_API_KEY)");
  if (!endpoint) missing.push("endpoint (AGENT_MEMORY_ENDPOINT)");
  if (missing.length > 0) {
    throw new Error(
      `@surrealdb/agent-memory-eve: missing Agent Memory connection settings: ${missing.join(
        ", ",
      )}. Set them via the environment or pass them to createAgentMemoryClient().`,
    );
  }

  return {
    // Non-null assertions are safe: the guard above throws when any is unset.
    context: context!,
    apiKey: apiKey!,
    endpoint: endpoint!,
    ...(config.timeout !== undefined ? { timeout: config.timeout } : {}),
    ...(config.maxRetries !== undefined ? { maxRetries: config.maxRetries } : {}),
    ...(config.fetchImpl !== undefined ? { fetchImpl: config.fetchImpl } : {}),
  };
}
