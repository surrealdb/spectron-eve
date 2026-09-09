import { defineDynamic, defineInstructions } from "eve/instructions";
import { defineHook, type HookDefinition } from "eve/hooks";
import { normaliseScope } from "@surrealdb/memory";
import {
  resolveScope,
  type ResolveScopeOptions,
  type SessionAuthLike,
} from "./identity.js";
import { provenanceLabels } from "./provenance.js";
import { getSharedAgentMemoryClient, type AgentMemory } from "./client.js";

/** The runtime context fields the write-back path reads. eve's `HookContext` satisfies it. */
interface WriteBackContext {
  readonly session: { readonly id: string; readonly auth: SessionAuthLike };
  readonly agent?: { readonly name?: string };
  readonly channel?: { readonly kind?: string };
}

/**
 * Auto-memory middleware: gives an eve agent persistent memory *without* the
 * model having to call a tool. It comes in two halves that mirror eve's own
 * split between context injection and observation:
 *
 * - {@link agentMemoryMemoryInstructions} — a dynamic *instructions* resolver
 *   (`agent/instructions/*.ts`). eve forbids hooks from injecting model
 *   context, so recall-and-inject must run here: each turn it recalls the
 *   user's relevant memories and lowers them to a system message.
 * - {@link agentMemoryMemoryHook} — a *hook* (`agent/hooks/*.ts`) that observes
 *   the durable event stream and writes the conversation back to AgentMemory with
 *   provenance after each message.
 *
 * Use them together for fully automatic memory, or either one alone.
 */

export interface AutoMemoryOptions {
  /** AgentMemory client. Defaults to the shared, env-configured client. */
  client?: AgentMemory;
  /** Scope-resolution options controlling the per-user memory scope. */
  scope?: ResolveScopeOptions;
}

export interface MemoryInstructionsOptions extends AutoMemoryOptions {
  /** Maximum memories to inject each turn. Default 8. */
  topK?: number;
  /** Heading rendered above the recalled memories. */
  header?: string;
  /**
   * Formats the recalled hits into the markdown injected as a system message.
   * Override to change the framing. Returning an empty string injects nothing.
   */
  format?: (hits: MemoryHit[], query: string) => string;
}

export interface MemoryHookOptions extends AutoMemoryOptions {
  /**
   * Which turn messages to persist. Default: user messages only (the source of
   * durable facts). Enable `assistant` to also record the agent's replies.
   */
  persist?: { user?: boolean; assistant?: boolean };
}

/** One recalled memory, mirroring AgentMemory's `MemoryHitJson`. */
export interface MemoryHit {
  id: string;
  score: number;
  source: string;
  text: string;
}

const DEFAULT_HEADER = "## Relevant memory\nWhat you know about the current user:";

function defaultFormat(hits: MemoryHit[], _query: string): string {
  if (hits.length === 0) return "";
  const lines = hits.map((h) => `- ${h.text}`);
  return `${DEFAULT_HEADER}\n${lines.join("\n")}`;
}

/** Extracts plain text from an eve/AI-SDK message content (string or parts). */
function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && "text" in part
          ? String((part as { text: unknown }).text)
          : "",
      )
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  return "";
}

/** Finds the most recent user message text in the conversation history. */
function latestUserText(messages: readonly { role: string; content: unknown }[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message && message.role === "user") {
      const text = contentToText(message.content);
      if (text) return text;
    }
  }
  return undefined;
}

/**
 * Builds the dynamic instructions resolver that recalls and injects memory at
 * the start of each turn. Export it as the default of a file under
 * `agent/instructions/`:
 *
 * ```ts
 * // agent/instructions/memory.ts
 * import { agentMemoryMemoryInstructions } from "@surrealdb/agent-memory-eve";
 * export default agentMemoryMemoryInstructions();
 * ```
 */
export function agentMemoryMemoryInstructions(options: MemoryInstructionsOptions = {}) {
  const topK = options.topK ?? 8;
  const format = options.format ?? defaultFormat;
  const header = options.header;

  return defineDynamic({
    events: {
      "turn.started": async (_event, ctx) => {
        const query = latestUserText(ctx.messages);
        if (!query) return null;
        try {
          const client = options.client ?? getSharedAgentMemoryClient();
          const lens = normaliseScope(resolveScope(ctx, options.scope));
          const result = await client.recall(query, { k: topK, lens, source: "eve" });
          const hits = (result.hits ?? []) as MemoryHit[];
          const markdown = header
            ? `${header}\n${hits.map((h) => `- ${h.text}`).join("\n")}`
            : format(hits, query);
          if (!markdown.trim()) return null;
          return defineInstructions({ markdown });
        } catch (error) {
          // Memory is best-effort: never fail a turn because recall failed.
          console.warn("[agentMemory-eve] recall for injection failed:", error);
          return null;
        }
      },
    },
  });
}

/**
 * Builds the hook that persists the conversation to AgentMemory after each
 * message, tagged with eve provenance. Export it as the default of a file under
 * `agent/hooks/`:
 *
 * ```ts
 * // agent/hooks/memory.ts
 * import { agentMemoryMemoryHook } from "@surrealdb/agent-memory-eve";
 * export default agentMemoryMemoryHook();
 * ```
 */
export function agentMemoryMemoryHook(options: MemoryHookOptions = {}): HookDefinition {
  const persistUser = options.persist?.user ?? true;
  const persistAssistant = options.persist?.assistant ?? false;

  async function write(
    text: string,
    role: "user" | "assistant",
    turnId: string | undefined,
    ctx: WriteBackContext,
  ): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const client = options.client ?? getSharedAgentMemoryClient();
      await client.remember(trimmed, {
        scopes: resolveScope(ctx, options.scope),
        role,
        labels: provenanceLabels(ctx, turnId),
      });
    } catch (error) {
      console.warn(`[agentMemory-eve] persisting ${role} memory failed:`, error);
    }
  }

  return defineHook({
    events: {
      "message.received": async (event, ctx) => {
        if (!persistUser) return;
        await write(event.data.message, "user", event.data.turnId, ctx);
      },
      "message.completed": async (event, ctx) => {
        if (!persistAssistant) return;
        if (!event.data.message) return;
        await write(event.data.message, "assistant", event.data.turnId, ctx);
      },
    },
  });
}
