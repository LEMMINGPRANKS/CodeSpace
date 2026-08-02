# CodeSpace

A terminal coding agent — like Claude Code / opencode, but provider-agnostic
and pure Node. Runs on any CPU (no AVX/bun requirement).

## Quick start

```bash
npm install
export ANTHROPIC_API_KEY=sk-...        # or OPENAI_API_KEY=...
npm start                              # or: npx tsx src/index.ts
```

Switch provider with `CODESPACE_PROVIDER=openai`.

## What it does

You type a request in natural language. CodeSpace calls an LLM, which can
optionally call tools (`read_file`, `write_file`, `list_files`, `run_bash`).
Results go back to the LLM, which can call more tools or produce a final
answer. The loop continues until the LLM stops calling tools.

## Layout

- `src/providers/` — LLM adapters (Anthropic, OpenAI). Each implements the
  same `LLMProvider` interface so the agent loop is provider-agnostic.
- `src/tools/` — tool registry + built-in tools. Add a new tool by writing
  one file that calls `registerTool({...})` and importing it from `index.ts`.
- `src/agent.ts` — the tool-use loop.
- `src/index.ts` — REPL entry point.

## Adding a provider

1. Create `src/providers/<name>.ts` implementing `LLMProvider`.
2. Add a branch in `src/config.ts` `loadConfig()`.
3. Done.

## Adding a tool

1. Create `src/tools/<name>.ts` calling `registerTool({ name, description, input_schema, run })`.
2. Import it from `src/index.ts` so it registers at startup.
3. Done — the LLM sees it automatically.
