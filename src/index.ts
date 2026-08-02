#!/usr/bin/env tsx
// CodeSpace entry point — readline REPL wired to the agent loop.
import * as readline from "node:readline";
import { loadConfig, buildProvider } from "./config.js";
import { runAgent } from "./agent.js";
import { firstRunSetup, saveCreds, promptHidden, type SavedCreds } from "./ui/setup.js";
import "./tools/files.js";
import "./tools/bash.js";
import type { Message } from "./providers/types.js";

async function main() {
  let cfg = await loadConfig();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\x1b[36myou>\x1b[0m ",
  });

  const history: Message[] = [];
  const cwd = process.cwd();

  console.log(`\x1b[1mCodeSpace\x1b[0m · provider=${cfg.provider.name} · cwd=${cwd}`);
  console.log(`Type your request. /help for commands. Ctrl+D to exit.\n`);
  rl.prompt();

  rl.on("line", async (line) => {
    const text = line.trim();
    if (!text) { rl.prompt(); return; }

    if (text === "/exit" || text === "/quit") { rl.close(); return; }
    if (text === "/help") {
      console.log("  /help                          — show this");
      console.log("  /change provider=<name>        — switch to anthropic | openai | zai");
      console.log("  /setup                         — re-run full provider + key setup");
      console.log("  /clear                         — wipe conversation history");
      console.log("  /provider                      — show current provider");
      console.log("  /exit                          — quit");
      rl.prompt();
      return;
    }
    if (text === "/provider") {
      console.log(`current provider: ${cfg.provider.name}`);
      rl.prompt();
      return;
    }
    const changeMatch = /^\/change\s+provider\s*=\s*(\w+)\s*$/.exec(text);
    if (changeMatch) {
      const requested = changeMatch[1].toLowerCase();
      if (requested !== "anthropic" && requested !== "openai" && requested !== "zai") {
        console.error(`\x1b[31munknown provider "${requested}". Use: anthropic, openai, or zai.\x1b[0m`);
        rl.prompt();
        return;
      }
      rl.pause();
      try {
        // Find a key: ZAI env, OPENAI env, ANTHROPIC env, or saved creds.
        // Fall back to interactive prompt.
        const envKey =
          requested === "zai" ? process.env.ZAI_API_KEY :
          requested === "openai" ? process.env.OPENAI_API_KEY :
          process.env.ANTHROPIC_API_KEY;
        let key = envKey || "";
        if (!key) {
          // Try saved creds for that provider.
          const saved = await import("./ui/setup.js").then(m => m.loadSavedCreds());
          if (saved && saved.provider === requested) key = saved.apiKey;
        }
        if (!key) {
          console.log(`No ${requested} key found in env or saved creds.`);
          key = await promptHidden("\x1b[36mPaste API key:\x1b[0m ");
          if (!key) {
            console.error("\x1b[31mNo key entered. Provider unchanged.\x1b[0m");
            rl.resume();
            rl.prompt();
            return;
          }
        }
        const creds: SavedCreds = {
          provider: requested,
          apiKey: key,
          model: requested === "zai" ? "zai/glm-5.2" : undefined,
        };
        await saveCreds(creds);
        cfg = { provider: buildProvider(creds) };
        console.log(`\x1b[32mprovider changed to ${cfg.provider.name}\x1b[0m`);
      } catch (err: any) {
        console.error(`\x1b[31m${err?.message || String(err)}\x1b[0m`);
      }
      rl.resume();
      rl.prompt();
      return;
    }
    if (text === "/clear") {
      history.length = 0;
      console.log("\x1b[2mhistory cleared\x1b[0m");
      rl.prompt();
      return;
    }
    if (text === "/setup") {
      rl.pause();
      try {
        const creds = await firstRunSetup();
        cfg = { provider: buildProvider(creds) };
        console.log(`\x1b[32mprovider is now ${cfg.provider.name}\x1b[0m`);
      } catch (err: any) {
        console.error(`\x1b[31m${err?.message || String(err)}\x1b[0m`);
      }
      rl.resume();
      rl.prompt();
      return;
    }

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
