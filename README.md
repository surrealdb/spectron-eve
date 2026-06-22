# @surrealdb/spectron-eve

The official [Eve](https://eve.dev) adapter for [Spectron](https://surrealdb.com/platform/spectron) — persistent, provenance-tracked memory for Eve agents, backed by SurrealDB's Spectron memory layer.

Eve gives agents durable execution and multi-channel reach. Spectron gives them
**memory** — semantic, episodic, and procedural recall with entity graphs and
tri-temporal provenance. This adapter wires the two together over Spectron's
TypeScript SDK.

It ships two layers you can use independently or together:

1. **A tool pack** the model calls explicitly — `recall`, `remember`, `forget`, `entities`, `timeline`.
2. **Auto-memory middleware** that recalls relevant memory before each turn and persists the conversation after it — no tool call required.

## Install

```bash
pnpm add @surrealdb/spectron-eve
# peers, already present in an eve project:
pnpm add eve zod
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
// agent/instructions/memory.ts — recalls + injects relevant memory each turn
import { spectronMemoryInstructions } from "@surrealdb/spectron-eve";
export default spectronMemoryInstructions();
```

```ts
// agent/hooks/memory.ts — persists the conversation back to Spectron
import { spectronMemoryHook } from "@surrealdb/spectron-eve";
export default spectronMemoryHook();
```

That's it. Each turn, the instructions resolver recalls memory scoped to the
current user (from `ctx.session.auth`) and lowers it to a system message; the
hook writes new turns back to Spectron tagged with eve provenance
(`eve_session`, `eve_turn`, `eve_agent`, `eve_channel`).

> Eve forbids hooks from injecting model context, which is why recall-and-inject
> lives in an `instructions/` resolver and only the write-back lives in a hook.

## Tool pack

To let the model recall/remember explicitly, add one file per tool under
`agent/tools/` — eve names each tool after its filename:

```ts
// agent/tools/recall.ts
export { recall as default } from "@surrealdb/spectron-eve/tools";
// agent/tools/remember.ts
export { remember as default } from "@surrealdb/spectron-eve/tools";
// …forget.ts, entities.ts, timeline.ts likewise
```

| Tool | What it does |
| --- | --- |
| `recall` | Hybrid semantic retrieval over the user's memory |
| `remember` | Store a durable fact, scoped + provenance-tagged |
| `forget` | Erase memory matching a natural-language query |
| `entities` | Read the knowledge graph (entities, attributes, relations) |
| `timeline` | Tri-temporal recall — "what did we know as of …" |

## Memory scoping

By default a user's memory is scoped to `{ user: <principalId> }` and **unified
across channels** — a preference learned in Slack is recalled on the web. Tune
it with `ResolveScopeOptions`:

```ts
spectronMemoryInstructions({ scope: { includeChannel: true } }); // per-channel
spectronMemoryInstructions({ scope: { userKey: "customer" } });  // custom key
spectronMemoryInstructions({ scope: { resolve: (ctx) => ({ team: "acme" }) } });
```

The same `scope` option is accepted by every tool factory (`recallTool`,
`rememberTool`, …) and by `createMemoryTools(options)`.

## Custom client

```ts
import { createSpectronClient, setSharedSpectronClient } from "@surrealdb/spectron-eve";

setSharedSpectronClient(
  createSpectronClient({ context: "support", endpoint: "https://…", apiKey: "sp-…" }),
);
```

## Reference agent

A complete, runnable example lives in
[`examples/memory-assistant`](./examples/memory-assistant): an Eve project for
an assistant that recalls a user's preferences across sessions, with the tool
pack and auto-memory middleware wired up and its own run instructions.

## Verifying end-to-end

1. `pnpm build && pnpm typecheck && pnpm test` — builds, type-checks, and runs the adapter unit tests (mocked Spectron client).
2. Against a live Spectron context, scaffold an agent (`npx eve@latest init my-agent`), copy in the files above, set the env vars, and run `pnpm dev`.
3. Drive a session and confirm cross-session recall:
   ```bash
   curl -X POST http://127.0.0.1:3000/eve/v1/session \
     -H 'content-type: application/json' \
     -d '{"message":"Remember that I prefer window seats."}'
   # then, in a new session:
   curl -X POST http://127.0.0.1:3000/eve/v1/session \
     -H 'content-type: application/json' \
     -d '{"message":"Which seat do I like?"}'
   ```
   The second session should recall the preference. Inspect provenance with the
   `timeline` tool or Spectron's retrieval traces.

## License

Apache-2.0
