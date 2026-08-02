// Configuration: pick provider + model. Lookup order:
//   1. CODESPACE_PROVIDER + ANTHROPIC_API_KEY / OPENAI_API_KEY env vars.
//   2. ~/.codespace/config.json from first-run setup.
//   3. Fall back to interactive first-run setup.
import { AnthropicProvider } from "./providers/anthropic.js";
import { OpenAIProvider } from "./providers/openai.js";
import type { LLMProvider } from "./providers/types.js";
import { loadSavedCreds, firstRunSetup, type SavedCreds } from "./ui/setup.js";

export interface Config {
  provider: LLMProvider;
}

export async function loadConfig(): Promise<Config> {
  const envProvider = (process.env.CODESPACE_PROVIDER || "").toLowerCase();
  const envKey = envProvider === "openai"
    ? process.env.OPENAI_API_KEY
    : (envProvider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.ANTHROPIC_API_KEY);

  let creds: SavedCreds;
  if (envKey) {
    const provider = envProvider === "openai" ? "openai" : "anthropic";
    creds = { provider, apiKey: envKey };
  } else {
    const saved = await loadSavedCreds();
    creds = saved ?? await firstRunSetup();
  }

  const provider = creds.provider === "openai"
    ? new OpenAIProvider(creds.apiKey, process.env.OPENAI_MODEL || "gpt-4o")
    : new AnthropicProvider(creds.apiKey, process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5");

  return { provider };
}
