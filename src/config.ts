// Configuration: pick provider + model. Lookup order:
//   1. CODESPACE_PROVIDER + matching env var (ZAI_API_KEY / OPENAI_API_KEY /
//      ANTHROPIC_API_KEY).
//   2. ~/.codespace/config.json from first-run setup.
//   3. Fall back to interactive first-run setup.
import { AnthropicProvider } from "./providers/anthropic.js";
import { OpenAIProvider } from "./providers/openai.js";
import type { LLMProvider } from "./providers/types.js";
import { loadSavedCreds, firstRunSetup, type SavedCreds } from "./ui/setup.js";

export interface Config {
  provider: LLMProvider;
}

// anyclaude proxy (lets us reuse a Claude Code subscription / GLM key via
// the Anthropic API shape). Falls back to direct Z.AI if not running.
const ANYCLAUDE_BASE_URL = process.env.ANTHROPIC_BASE_URL || "http://localhost:40767";

function buildProvider(creds: SavedCreds): LLMProvider {
  switch (creds.provider) {
    case "anthropic":
      return new AnthropicProvider(
        creds.apiKey,
        process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      );
    case "openai":
      return new OpenAIProvider(
        creds.apiKey,
        process.env.OPENAI_MODEL || "gpt-4o",
      );
    case "zai":
      // Z.AI via anyclaude proxy (Anthropic shape). Model name keeps the
      // zai/ prefix the proxy expects.
      return new AnthropicProvider(
        creds.apiKey,
        creds.model || "zai/glm-5.2",
        4096,
        ANYCLAUDE_BASE_URL,
      );
  }
}

function credsFromEnv(): SavedCreds | null {
  const which = (process.env.CODESPACE_PROVIDER || "").toLowerCase();
  if (which === "zai" && process.env.ZAI_API_KEY) {
    return { provider: "zai", apiKey: process.env.ZAI_API_KEY, model: process.env.ZAI_MODEL || "zai/glm-5.2" };
  }
  if (which === "openai" && process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
  }
  if (which === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY };
  }
  // No CODESPACE_PROVIDER set but ZAI_API_KEY is in env — use it by default.
  if (process.env.ZAI_API_KEY) {
    return { provider: "zai", apiKey: process.env.ZAI_API_KEY, model: "zai/glm-5.2" };
  }
  return null;
}

export async function loadConfig(): Promise<Config> {
  const env = credsFromEnv();
  if (env) return { provider: buildProvider(env) };
  const saved = await loadSavedCreds();
  if (saved) return { provider: buildProvider(saved) };
  const creds = await firstRunSetup();
  return { provider: buildProvider(creds) };
}
