// First-run setup. If no API key is found in env or saved config, draw a
// bordered box, prompt for provider + key, save to ~/.codespace/config.json
// (chmod 600), and return the chosen provider. Subsequent runs skip this.

import * as readline from "node:readline";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

export interface SavedCreds {
  provider: "anthropic" | "openai";
  apiKey: string;
  model?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".codespace");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export async function loadSavedCreds(): Promise<SavedCreds | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.apiKey && parsed?.provider) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function saveCreds(creds: SavedCreds): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

// Draw a title + prompt inside an ASCII box.
function drawBox(lines: string[]): string {
  const width = Math.max(...lines.map(l => l.length)) + 4;
  const top = "┌" + "─".repeat(width - 2) + "┐";
  const bot = "└" + "─".repeat(width - 2) + "┘";
  const mid = lines.map(l => {
    const pad = width - 4 - l.length;
    return "│ " + l + " ".repeat(pad < 0 ? 0 : pad) + " │";
  });
  return [top, ...mid, bot].join("\n");
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, ans => resolve(ans.trim())));
}

function askHidden(rl: readline.Interface, prompt: string): Promise<string> {
  // Temporarily mute output so the pasted key isn't echoed.
  const write = (rl as any)._writeToOutput.bind(rl);
  return new Promise<string>(resolve => {
    (rl as any)._writeToOutput = (s: string) => {
      if (s === prompt || s === "\r\n" || s === "\n" || s === "\r") write(s);
      else write("*".repeat(s.length));
    };
    rl.question(prompt, ans => {
      (rl as any)._writeToOutput = write;
      write("\n");
      resolve(ans.trim());
    });
  });
}

export async function firstRunSetup(): Promise<SavedCreds> {
  console.log();
  console.log("\x1b[36m" + drawBox([
    "  ___                    ___    ",
    " / __| ___ _ ___ _____  | _ \\_ _ ___  ___ ",
    "| (_ \\/ -_) '_\\ V / -_) |  _/ '_/ _ \\/ _ \\",
    " \\___/\\___|_|  \\_/\\___| |_| |_| \\___/\\___/",
    "",
    "  provider-agnostic terminal coding agent",
  ]) + "\x1b[0m");
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  try {
    console.log("Which provider do you want to use?");
    console.log("  \x1b[1m1.\x1b[0m Anthropic (Claude)");
    console.log("  \x1b[1m2.\x1b[0m OpenAI (GPT)");
    console.log();
    const choice = await ask(rl, "\x1b[36mchoice [1]:\x1b[0m ");
    const provider: "anthropic" | "openai" = choice === "2" ? "openai" : "anthropic";

    console.log();
    console.log(`Get your key from:`);
    console.log(provider === "anthropic"
      ? "  \x1b[2mhttps://console.anthropic.com/settings/keys\x1b[0m"
      : "  \x1b[2mhttps://platform.openai.com/api-keys\x1b[0m");
    console.log();
    const apiKey = await askHidden(rl, "\x1b[36mPaste API key:\x1b[0m ");
    if (!apiKey) {
      console.error("\x1b[31mNo key entered. Bye.\x1b[0m");
      process.exit(1);
    }

    const creds: SavedCreds = { provider, apiKey };
    await saveCreds(creds);
    console.log();
    console.log(`\x1b[32m✓ saved to ${CONFIG_PATH}\x1b[0m`);
    console.log();
    return creds;
  } finally {
    rl.close();
  }
}
