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

// Z.AI (Zhipu GLM) — OpenAI-compatible API endpoint.
const ZAI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

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
      return new OpenAIProvider(
        creds.apiKey,
        creds.model || "glm-4.6",
        ZAI_BASE_URL,
      );
  }
}

function credsFromEnv(): SavedCreds | null {
  const which = (process.env.CODESPACE_PROVIDER || "").toLowerCase();
  if (which === "zai" && process.env.ZAI_API_KEY) {
    return { provider: "zai", apiKey: process.env.ZAI_API_KEY, model: process.env.ZAI_MODEL || "glm-4.6" };
  }
  if (which === "openai" && process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
  }
  if (which === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY };
  }
  // No CODESPACE_PROVIDER set but ZAI_API_KEY is in env — use it by default.
  if (process.env.ZAI_API_KEY) {
    return { provider: "zai", apiKey: process.env.ZAI_API_KEY, model: "glm-4.6" };
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
