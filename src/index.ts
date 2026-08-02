#!/usr/bin/env tsx
// CodeSpace entry point — readline REPL wired to the agent loop.
import * as readline from "node:readline";
import { loadConfig } from "./config.js";
import { runAgent } from "./agent.js";
import "./tools/files.js";
import "./tools/bash.js";
import type { Message } from "./providers/types.js";

async function main() {
  const cfg = await loadConfig();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\x1b[36myou>\x1b[0m ",
  });

  const history: Message[] = [];
  const cwd = process.cwd();

  console.log(`\x1b[1mCodeSpace\x1b[0m · provider=${cfg.provider.name} · cwd=${cwd}`);
  console.log(`Type your request. Ctrl+D to exit.\n`);
  rl.prompt();

  rl.on("line", async (line) => {
    const text = line.trim();
    if (!text) { rl.prompt(); return; }
    if (text === "/exit" || text === "/quit") { rl.close(); return; }
    rl.pause();
    try {
      await runAgent(history, text, {
        provider: cfg.provider,
        onAssistant(blocks) {
          for (const b of blocks) {
            if (b.type === "text") console.log(`\x1b[35m${b.text}\x1b[0m`);
          }
        },
      });
    } catch (err: any) {
      console.error(`\x1b[31mAgent error: ${err?.message || String(err)}\x1b[0m`);
    }
    rl.resume();
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nbye.");
    process.exit(0);
  });
}

main().catch(err => {
  console.error(`\x1b[31m${err?.message || String(err)}\x1b[0m`);
  process.exit(1);
});
