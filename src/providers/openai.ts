// OpenAI adapter. OpenAI's tool-call shape is different from Anthropic's
// (function calls wrapped in a `tool_calls` array, results as separate
// `role: "tool"` messages), so this adapter does more reshaping.
import OpenAI from "openai";
import type {
  LLMProvider, LLMResponse, Message, ToolSchema,
  AssistantContent, UserContent,
} from "./types.js";

export class OpenAIProvider implements LLMProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o", baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    this.model = model;
  }

  async chat(messages: Message[], tools: ToolSchema[]): Promise<LLMResponse> {
    const sys: OpenAI.Chat.ChatCompletionSystemMessageParam = {
      role: "system",
      content: "You are CodeSpace, a terminal coding agent. " +
        "Use tools to read files and run commands. Don't ask permission — just act. " +
        "Be concise.",
    };
    const mapped = [sys, ...messages.flatMap(toOpenAI)];
    const oaiTools: OpenAI.Chat.ChatCompletionTool[] = tools.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema as Record<string, unknown>,
      },
    }));
    const resp = await this.client.chat.completions.create({
      model: this.model,
      messages: mapped,
      tools: oaiTools,
    });
    const choice = resp.choices[0];
    const msg = choice.message;
    const content: AssistantContent[] = [];
    if (msg.content) content.push({ type: "text", text: msg.content });
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        content.push({
          type: "tool_use",
          id: tc.id,
          name: tc.function.name,
          input: args,
        });
      }
    }
    const stopReason: LLMResponse["stopReason"] =
      choice.finish_reason === "tool_calls" ? "tool_use" :
      choice.finish_reason === "length" ? "max_tokens" : "end_turn";
    return { content, stopReason };
  }
}

// Flatten our unified shape into OpenAI's message list — one assistant
// turn with tool calls stays as one message, but each tool result becomes
// its own `role: "tool"` message.
function toOpenAI(m: Message): OpenAI.Chat.ChatCompletionMessageParam[] {
  if (m.role === "assistant") {
    const parts = m.content as AssistantContent[];
    const text = parts.filter(p => p.type === "text").map(p => (p as any).text).join("");
    const calls = parts.filter(p => p.type === "tool_use") as Extract<AssistantContent, { type: "tool_use" }>[];
    if (calls.length === 0) {
      return [{ role: "assistant", content: text || "" }];
    }
    return [{
      role: "assistant",
      content: text || null,
      tool_calls: calls.map(c => ({
        id: c.id,
        type: "function" as const,
        function: { name: c.name, arguments: JSON.stringify(c.input) },
      })),
    }];
  }
  // User message: text becomes a normal message; tool_results become tool messages.
  const parts = m.content as UserContent[];
  const out: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  const text = parts.filter(p => p.type === "text").map(p => (p as any).text).join("");
  if (text) out.push({ role: "user", content: text });
  for (const p of parts) {
    if (p.type === "tool_result") {
      out.push({ role: "tool", tool_call_id: p.toolUseId, content: p.content });
    }
  }
  return out;
}
