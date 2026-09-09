import { test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveScope,
  resolveUserId,
  provenanceLabels,
  agentMemoryMemoryInstructions,
  agentMemoryMemoryHook,
} from "../dist/index.js";
import { recallTool, rememberTool } from "../dist/tools/index.js";

/**
 * Records every call so assertions can inspect what reached the SDK. Only the
 * methods the adapter actually uses are implemented; the rest are absent.
 */
function mockClient() {
  const calls: { method: string; args: unknown[] }[] = [];
  const client = {
    calls,
    recall(query: string, options?: unknown) {
      calls.push({ method: "recall", args: [query, options] });
      return Promise.resolve({
        hits: [
          { id: "m1", score: 0.9, source: "fact", text: "Prefers dark mode" },
          { id: "m2", score: 0.8, source: "fact", text: "Lives in Berlin" },
        ],
      });
    },
    remember(text: string, options?: unknown) {
      calls.push({ method: "remember", args: [text, options] });
      return Promise.resolve({ ok: true });
    },
  };
  // Cast through unknown: the adapter only touches the methods above.
  return client as unknown as import("../dist/index.js").AgentMemory & {
    calls: typeof calls;
  };
}

const TOOL_CTX = {
  session: {
    id: "sess_123",
    auth: {
      current: { principalId: "user-abc", principalType: "human" },
      initiator: { principalId: "user-abc", principalType: "human" },
    },
    turn: { id: "turn_1", sequence: 0 },
  },
};

const HOOK_CTX = {
  session: TOOL_CTX.session,
  agent: { name: "support-bot" },
  channel: { kind: "slack" },
};

test("resolveScope maps the authenticated principal to a user scope", () => {
  assert.deepEqual(resolveScope(TOOL_CTX as never), ["user/user-abc"]);
  assert.equal(resolveUserId(TOOL_CTX as never), "user-abc");
});

test("resolveScope falls back to anonymous when unauthenticated", () => {
  const ctx = { session: { id: "s", auth: { current: null, initiator: null } } };
  assert.deepEqual(resolveScope(ctx as never), ["user/anonymous"]);
});

test("resolveScope can narrow by channel when asked", () => {
  assert.deepEqual(resolveScope(HOOK_CTX as never, { includeChannel: true }), [
    "user/user-abc",
    "channel/slack",
  ]);
});

test("provenance labels link a write back to the eve run", () => {
  assert.deepEqual(provenanceLabels(HOOK_CTX as never, "turn_1"), [
    "eve_session=sess_123",
    "eve_turn=turn_1",
    "eve_agent=support-bot",
    "eve_channel=slack",
  ]);
});

test("recall tool scopes the read by lens and tags the source", async () => {
  const client = mockClient();
  const tool = recallTool({ client });
  const result = await tool.execute({ query: "what theme?" }, TOOL_CTX as never);

  const call = client.calls.find((c) => c.method === "recall");
  assert.ok(call, "recall was called");
  const [query, options] = call.args as [string, Record<string, unknown>];
  assert.equal(query, "what theme?");
  assert.deepEqual(options.lens, [["user/user-abc"]]);
  assert.equal(options.source, "eve");
  assert.equal((result as { hits: unknown[] }).hits.length, 2);
});

test("remember tool writes scoped and provenance-tagged memory", async () => {
  const client = mockClient();
  const tool = rememberTool({ client });
  await tool.execute(
    { text: "User loves espresso", labels: ["topic=coffee"] },
    TOOL_CTX as never,
  );

  const call = client.calls.find((c) => c.method === "remember");
  assert.ok(call);
  const [text, options] = call.args as [string, Record<string, unknown>];
  assert.equal(text, "User loves espresso");
  assert.deepEqual(options.scopes, ["user/user-abc"]);
  assert.equal(options.role, "user");
  assert.deepEqual(options.labels, [
    "eve_session=sess_123",
    "eve_turn=turn_1",
    "topic=coffee",
  ]);
});

test("instructions resolver recalls the latest user message and injects markdown", async () => {
  const client = mockClient();
  const dynamic = agentMemoryMemoryInstructions({ client }) as {
    events: Record<string, (event: unknown, ctx: unknown) => Promise<unknown>>;
  };
  const ctx = {
    ...TOOL_CTX,
    channel: { kind: "web" },
    messages: [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello!" },
      { role: "user", content: "What theme do I like?" },
    ],
  };
  const result = (await dynamic.events["turn.started"]!({}, ctx)) as {
    markdown: string;
  } | null;

  assert.ok(result, "instructions were produced");
  assert.match(result.markdown, /Prefers dark mode/);
  assert.match(result.markdown, /Lives in Berlin/);

  const call = client.calls.find((c) => c.method === "recall");
  const [query] = call!.args as [string];
  assert.equal(query, "What theme do I like?", "recall uses the latest user turn");
});

test("instructions resolver injects nothing when there is no user message", async () => {
  const client = mockClient();
  const dynamic = agentMemoryMemoryInstructions({ client }) as {
    events: Record<string, (event: unknown, ctx: unknown) => Promise<unknown>>;
  };
  const ctx = { ...TOOL_CTX, messages: [{ role: "assistant", content: "Hi" }] };
  const result = await dynamic.events["turn.started"]!({}, ctx);
  assert.equal(result, null);
  assert.equal(client.calls.length, 0, "no recall without a query");
});

test("hook persists user messages with provenance, skips assistant by default", async () => {
  const client = mockClient();
  const hook = agentMemoryMemoryHook({ client }) as {
    events: Record<string, (event: unknown, ctx: unknown) => Promise<void>>;
  };

  await hook.events["message.received"]!(
    { data: { message: "Remember I like espresso", turnId: "turn_1" } },
    HOOK_CTX,
  );
  await hook.events["message.completed"]!(
    { data: { message: "Got it!", turnId: "turn_1" } },
    HOOK_CTX,
  );

  const writes = client.calls.filter((c) => c.method === "remember");
  assert.equal(writes.length, 1, "only the user message is persisted by default");
  const [text, options] = writes[0]!.args as [string, Record<string, unknown>];
  assert.equal(text, "Remember I like espresso");
  assert.equal(options.role, "user");
  assert.deepEqual(options.scopes, ["user/user-abc"]);
});

test("hook persists assistant replies when enabled", async () => {
  const client = mockClient();
  const hook = agentMemoryMemoryHook({ client, persist: { assistant: true } }) as {
    events: Record<string, (event: unknown, ctx: unknown) => Promise<void>>;
  };
  await hook.events["message.completed"]!(
    { data: { message: "Got it!", turnId: "turn_1" } },
    HOOK_CTX,
  );
  const writes = client.calls.filter((c) => c.method === "remember");
  assert.equal(writes.length, 1);
  assert.equal((writes[0]!.args as [string, Record<string, unknown>])[1].role, "assistant");
});
