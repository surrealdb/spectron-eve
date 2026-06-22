/**
 * Provenance tagging.
 *
 * Every memory this adapter writes carries `key=value` labels that link the
 * Spectron row back to the eve run that produced it. Combined with Spectron's
 * tri-temporal store and retrieval traces, this answers "why did the agent know
 * this?" and ties a recalled fact to a specific eve session/turn in
 * Observability.
 */

/** The eve-side coordinates worth recording on a Spectron write. */
export interface ProvenanceContextLike {
  readonly session: { readonly id: string };
  readonly agent?: { readonly name?: string };
  readonly channel?: { readonly kind?: string };
}

/** Label key prefix shared by every provenance label this adapter emits. */
export const PROVENANCE_PREFIX = "eve_";

/**
 * Builds the provenance label set for a write originating from an eve context.
 *
 * @param ctx   The eve runtime context (tool/hook/dynamic-resolver).
 * @param turnId Optional turn id (tools expose `ctx.session.turn.id`; some
 *   stream events carry it on `event.data.turnId`).
 */
export function provenanceLabels(
  ctx: ProvenanceContextLike,
  turnId?: string,
): string[] {
  const labels = [`${PROVENANCE_PREFIX}session=${ctx.session.id}`];
  if (turnId) labels.push(`${PROVENANCE_PREFIX}turn=${turnId}`);
  if (ctx.agent?.name) labels.push(`${PROVENANCE_PREFIX}agent=${ctx.agent.name}`);
  if (ctx.channel?.kind) labels.push(`${PROVENANCE_PREFIX}channel=${ctx.channel.kind}`);
  return labels;
}
