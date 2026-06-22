# Memory assistant: `@surrealdb/spectron-eve` example

A complete, runnable [Eve](https://eve.dev) agent that remembers users across
sessions and channels, powered by [Spectron](https://surrealdb.com/platform/spectron).

It wires up both layers of the adapter:

- **Auto-memory**: [`agent/instructions/memory.ts`](./agent/instructions/memory.ts) recalls relevant memory each turn and injects it; [`agent/hooks/memory.ts`](./agent/hooks/memory.ts) persists the conversation back to Spectron with provenance.
- **Tool pack**: [`agent/tools/`](./agent/tools) exposes `recall`, `remember`, `forget`, `entities`, and `timeline` for explicit use by the model, one static file per tool.

## Layout

```
agent/
  agent.ts                 # defineAgent: model only; memory is wired by siblings
  instructions.md          # base system prompt
  instructions/memory.ts   # pre-turn recall + inject (dynamic instructions)
  hooks/memory.ts          # post-turn write-back (observe-only hook)
  tools/{recall,remember,forget,entities,timeline}.ts
```

## Run it

From the repository root, build the adapter first so the local
`file:../..` dependency resolves:

```bash
bun install && bun run build        # builds @surrealdb/spectron-eve
cd examples/memory-assistant
bun install                         # links the adapter + eve + zod
cp .env.example .env                # fill in your Spectron credentials
bun run dev                         # starts the eve dev server
```

Set your Spectron connection in `.env`:

```bash
SPECTRON_CONTEXT=your-context-id
SPECTRON_API_KEY=sp-...
SPECTRON_ENDPOINT=https://your-spectron-endpoint
```

## Try cross-session memory

Tell the agent something in one session:

```bash
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Remember that I prefer window seats and I am vegetarian."}'
```

Then ask about it in a brand-new session:

```bash
curl -X POST http://127.0.0.1:3000/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"Book me a flight, you know my preferences."}'
```

The second session recalls the preferences with no tool call: the auto-memory
instructions resolver retrieved them (scoped to the caller) and injected them
into the prompt. The write from session one carries `eve_session` / `eve_turn`
provenance labels you can inspect via the `timeline` tool or Spectron's
retrieval traces.

> Without authenticated callers, memory is scoped to a shared `anonymous` user.
> Add a channel or route-level auth strategy (Slack, OIDC, JWT, …) so each end
> user gets their own memory scope; the adapter derives it from
> `ctx.session.auth` automatically.
