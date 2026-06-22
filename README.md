# @surrealdb/spectron-eve

The official [Eve](https://eve.dev) adapter for [Spectron](https://surrealdb.com/platform/spectron): persistent, provenance-tracked memory for Eve agents, backed by SurrealDB's Spectron memory layer.

Eve gives agents durable execution and multi-channel reach. Spectron gives them
**memory**: semantic, episodic, and procedural recall with entity graphs and
tri-temporal provenance. This adapter wires the two together over Spectron's
TypeScript SDK.

It ships two layers you can use independently or together:

1. **A tool pack** the model calls explicitly: `recall`, `remember`, `forget`, `entities`, `timeline`.
2. **Auto-memory middleware** that recalls relevant memory before each turn and persists the conversation after it, with no tool call required.

## Before / after

**Before** (a vanilla Eve agent, no memory layer):

```ts
// agent/agent.ts
import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-5.4-mini",
});

// Every session starts from zero. The agent has no idea who it is talking to.
//
// User (Monday):  "I'm vegetarian and I always book window seats."
// Agent:          "Got it!"   // ...nothing is actually persisted anywhere
//
// User (Tuesday, new session): "Book me a flight."
// Agent:          "Sure! Any seating or meal preferences?"
//                 // it asked the exact same thing yesterday. the user has to
//                 // repeat themselves every time, on every channel, forever.
//
// Want real memory? You're now hand-rolling a vector store, an embeddings
// pipeline, retrieval, per-user scoping, and write-back on every turn.
// None of that is your actual agent.
```

**After** (same agent, plus two files):

```ts
// agent/agent.ts is UNCHANGED
import { defineAgent } from "eve";
export default defineAgent({ model: "openai/gpt-5.4-mini" });

// agent/instructions/memory.ts: recall + inject, automatically
import { spectronMemoryInstructions } from "@surrealdb/spectron-eve";
export default spectronMemoryInstructions();

// agent/hooks/memory.ts: persist every turn, automatically
import { spectronMemoryHook } from "@surrealdb/spectron-eve";
export default spectronMemoryHook();

// User (Monday):  "I'm vegetarian and I always book window seats."
// Agent:          "Got it!"   // persisted to Spectron, scoped to this user
//
// User (Tuesday, brand-new session, even a different channel):
//                 "Book me a flight."
// Agent:          "Booking you a window seat and flagging a vegetarian meal,
//                  just how you like it."
//                 // recalled automatically: no tool call, no re-asking.
```

## Install

```bash
bun add @surrealdb/spectron-eve
# peers, already present in an eve project:
bun add eve zod
```

Configure the Spectron connection via environment variables (or pass them to
`createSpectronClient`):

```bash
SPECTRON_CONTEXT=your-context-id
SPECTRON_API_KEY=sp-...
SPECTRON_ENDPOINT=https://your-spectron-endpoint
```

## Auto-memory (recommended)

Memory becomes automatic. Add two files to your `agent/` directory:

```ts
// agent/instructions/memory.ts: recalls + injects relevant memory each turn
import { spectronMemoryInstructions } from "@surrealdb/spectron-eve";
export default spectronMemoryInstructions();
```

```ts
// agent/hooks/memory.ts: persists the conversation back to Spectron
import { spectronMemoryHook } from "@surrealdb/spectron-eve";
export default spectronMemoryHook();
```

That's it. Each turn, the instructions resolver recalls memory scoped to the
current user (from `ctx.session.auth`) and lowers it to a system message. The
hook writes new turns back to Spectron tagged with eve provenance
(`eve_session`, `eve_turn`, `eve_agent`, `eve_channel`).

> Eve forbids hooks from injecting model context, which is why recall-and-inject
> lives in an `instructions/` resolver and only the write-back lives in a hook.

## Tool pack

To let the model recall and remember explicitly, add one static file per tool
under `agent/tools/`. Eve names each tool after its filename:

```ts
// agent/tools/recall.ts
export { recall as default } from "@surrealdb/spectron-eve/tools";
// agent/tools/remember.ts -> remember, and likewise forget, entities, timeline
```

Static per-file tools are the recommended form: they are resolved once and stay
stable across turns, which keeps the prompt cache warm. (If you would rather
register all five from one file, a `defineDynamic` resolver returning
`createMemoryTools()` also works, at the cost of per-session resolution.)

| Tool | What it does |
| --- | --- |
| `recall` | Hybrid semantic retrieval over the user's memory |
| `remember` | Store a durable fact, scoped and provenance-tagged |
| `forget` | Erase memory matching a natural-language query |
| `entities` | Read the knowledge graph (entities, attributes, relations) |
| `timeline` | Tri-temporal recall: "what did we know as of ...?" |

## Memory scoping

By default a user's memory is scoped to `{ user: <principalId> }` and **unified
across channels**, so a preference learned in Slack is recalled on the web. Tune
it with `ResolveScopeOptions`:

```ts
spectronMemoryInstructions({ scope: { includeChannel: true } }); // per-channel
spectronMemoryInstructions({ scope: { userKey: "customer" } });  // custom key
spectronMemoryInstructions({ scope: { resolve: (ctx) => ({ team: "acme" }) } });
```

The same `scope` option is accepted by every tool factory (`recallTool`,
`rememberTool`, and friends) and by `createMemoryTools(options)`.

## Custom client

```ts
import { createSpectronClient, setSharedSpectronClient } from "@surrealdb/spectron-eve";

setSharedSpectronClient(
  createSpectronClient({ context: "support", endpoint: "https://...", apiKey: "sp-..." }),
);
```

## Reference agent

A complete, runnable example lives in
[`examples/memory-assistant`](./examples/memory-assistant): an Eve project for
an assistant that recalls a user's preferences across sessions, with the tool
pack and auto-memory middleware wired up and its own run instructions.

## License

Apache-2.0
