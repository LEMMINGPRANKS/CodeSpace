# CodeSpace

A terminal coding agent built from scratch — like Claude Code / opencode, but
provider-agnostic and pure Node (no native binaries, runs on old CPUs).

## Run it
```
npm install
export ANTHROPIC_API_KEY=...   # or OPENAI_API_KEY=...
npx tsx src/index.ts
```

## Architecture
- **Providers** (`src/providers/`): thin adapters over LLM HTTP APIs. Each
  implements `chat(messages, tools) → response` and a tool-call extractor.
  Adding a new provider = one new file + one entry in `PROVIDERS`.
- **Tools** (`src/tools/`): each tool is `{ name, schema, run(input) }`. The
  registry exposes them by name; the agent loop calls them when the LLM
  requests one.
- **Agent** (`src/agent.ts`): the tool-use loop. Send message → if LLM
  requests a tool, execute it and feed the result back → repeat until LLM
  stops calling tools. Provider-agnostic.
- **UI** (`src/ui/`): readline REPL. Streams tokens as they arrive. Plain
  stdin/stdout, no TUI library.

## Tunables
All model names, max-tokens, system prompts live in `src/config.ts`.

## Release discipline
Each version gets its own commit + tag, just like Wildcraft. Don't bundle
multiple releases into one commit.
