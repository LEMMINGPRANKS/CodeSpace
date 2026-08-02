// Configuration: which provider + model to use. Reads from env vars.
import { AnthropicProvider } from "./providers/anthropic.js";
import { OpenAIProvider } from "./providers/openai.js";
import type { LLMProvider } from "./providers/types.js";

export interface Config {
  provider: LLMProvider;
}

export function loadConfig(): Config {
  const which = (process.env.CODESPACE_PROVIDER || "anthropic").toLowerCase();
  let provider: LLMProvider;
  if (which === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set. Export it or set CODESPACE_PROVIDER=openai.");
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    provider = new AnthropicProvider(key, model);
  } else if (which === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set.");
    const model = process.env.OPENAI_MODEL || "gpt-4o";
    provider = new OpenAIProvider(key, model);
  } else {
    throw new Error(`Unknown provider "${which}". Use 'anthropic' or 'openai'.`);
  }
  return { provider };
}
