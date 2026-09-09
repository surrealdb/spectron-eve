import type { Scope } from "@surrealdb/memory";

/**
 * Auth metadata as exposed on the active Eve session. Mirrors `eve`'s
 * `SessionAuth` (current caller + original initiator) without importing the
 * type, so this module stays decoupled from `eve`'s internal paths.
 */
export interface SessionAuthLike {
  readonly current: PrincipalLike | null;
  readonly initiator: PrincipalLike | null;
}

/** Authenticated caller principal, mirroring eve's `SessionAuthContext`. */
export interface PrincipalLike {
  readonly principalId: string;
  readonly principalType?: string;
  readonly subject?: string;
  readonly attributes?: Readonly<Record<string, string | readonly string[]>>;
}

/**
 * The slice of an eve runtime context this adapter needs to derive a memory
 * scope. `ToolContext`, `HookContext`, and `DynamicResolveContext` all satisfy
 * it structurally (the optional `channel` is present on hooks and dynamic
 * resolvers, absent inside tool `execute`).
 */
export interface ScopeContextLike {
  readonly session: { readonly id: string; readonly auth: SessionAuthLike };
  readonly channel?: { readonly kind?: string };
}

export interface ResolveScopeOptions {
  /** Scope key under which the end-user identity is recorded. Default `"user"`. */
  userKey?: string;
  /**
   * Use the session *initiator* (who started the conversation) instead of the
   * *current* caller (who sent the latest request). Default `false`.
   */
  preferInitiator?: boolean;
  /** Identity used when no authenticated principal is present. Default `"anonymous"`. */
  anonymousId?: string;
  /**
   * Also narrow the scope by the originating channel (e.g. `slack`, `discord`),
   * yielding `{ [userKey]: id, channel: kind }`. Default `false` so a user's
   * memory unifies across every channel they reach the agent through.
   */
  includeChannel?: boolean;
  /**
   * Full override. When provided, it alone decides the scope and the options
   * above are ignored.
   */
  resolve?: (ctx: ScopeContextLike) => Scope;
}

/** Picks the most specific stable identifier off a principal. */
function principalIdentity(principal: PrincipalLike | null): string | undefined {
  if (!principal) return undefined;
  return principal.subject ?? principal.principalId;
}

/**
 * Resolves a stable end-user identity from an eve runtime context, falling back
 * to the configured anonymous id when the request is unauthenticated.
 */
export function resolveUserId(
  ctx: ScopeContextLike,
  options: ResolveScopeOptions = {},
): string {
  const auth = ctx.session.auth;
  const primary = options.preferInitiator ? auth.initiator : auth.current;
  const fallback = options.preferInitiator ? auth.current : auth.initiator;
  return (
    principalIdentity(primary) ??
    principalIdentity(fallback) ??
    options.anonymousId ??
    "anonymous"
  );
}

/**
 * Maps an eve runtime context to a AgentMemory {@link Scope}. By default a user's
 * memory is scoped to `{ user: <principal> }` and unified across channels, so
 * preferences learned in Slack are recalled on the web and vice versa.
 */
export function resolveScope(
  ctx: ScopeContextLike,
  options: ResolveScopeOptions = {},
): Scope {
  if (options.resolve) return options.resolve(ctx);

  const userKey = options.userKey ?? "user";
  const scope: string[] = [`${userKey}/${resolveUserId(ctx, options)}`];

  const channelKind = ctx.channel?.kind;
  if (options.includeChannel && channelKind) {
    scope.push(`channel/${channelKind}`);
  }
  return scope;
}
