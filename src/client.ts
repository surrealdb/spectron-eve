import { Spectron } from "@surrealdb/spectron";
import { resolveSpectronOptions, type SpectronConnectionConfig } from "./config.js";

/**
 * Creates a Spectron client from explicit config and/or environment variables.
 *
 * @see {@link SpectronConnectionConfig} for the accepted settings.
 */
export function createSpectronClient(config?: SpectronConnectionConfig): Spectron {
  return new Spectron(resolveSpectronOptions(config));
}

let shared: Spectron | undefined;

/**
 * Returns a process-wide shared Spectron client, constructed lazily from the
 * environment on first use. The tool pack and auto-memory hooks use this so a
 * single agent process reuses one client (and its retry/idempotency state).
 *
 * Prefer {@link createSpectronClient} when you need an explicitly-configured
 * client (e.g. a second context, or per-request overrides).
 */
export function getSharedSpectronClient(): Spectron {
  if (!shared) {
    shared = createSpectronClient();
  }
  return shared;
}

/**
 * Replaces the process-wide shared client. Intended for tests (inject a client
 * built with a mock `fetchImpl`) and for advanced setups that configure the
 * client once at startup.
 */
export function setSharedSpectronClient(client: Spectron): void {
  shared = client;
}

export { Spectron };
