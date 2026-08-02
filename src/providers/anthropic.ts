// Anthropic (Claude) adapter. Translates our provider-agnostic Message type
// into the shape the @anthropic-ai/sdk expects, then unwraps the response.
import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider, LLMResponse, Message, ToolSchema,
  AssistantContent, UserContent,
} from "./types.js";

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model = "claude-sonnet-4-5", maxTokens = 4096) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async chat(messages: Message[], tools: ToolSchema[]): Promise<LLMResponse> {
    const sys = "You are CodeSpace, a terminal coding agent. " +
      "Use tools to read files and run commands. Don't ask permission — just act. " +
      "Be concise.";
    const resp = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: sys,
      messages: messages.map(toAnthropic),
      tools: tools as any,
    });

    const content: AssistantContent[] = [];
    for (const block of resp.content) {
      if (block.type === "text") {
        content.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        content.push({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }
    const stopReason: LLMResponse["stopReason"] =
      resp.stop_reason === "tool_use" ? "tool_use" :
      resp.stop_reason === "max_tokens" ? "max_tokens" :
      resp.stop_reason === "end_turn" ? "end_turn" : "end_turn";
    return { content, stopReason };
  }
}

function toAnthropic(m: Message) {
  if (m.role === "assistant") {
    return {
      role: "assistant" as const,
      content: (m.content as AssistantContent[]).map(b =>
        b.type === "text"
          ? { type: "text" as const, text: b.text }
          : { type: "tool_use" as const, id: b.id, name: b.name, input: b.input }
      ),
    };
  }
  return {
    role: "user" as const,
    content: (m.content as UserContent[]).map(b =>
      b.type === "text"
        ? { type: "text" as const, text: b.text }
        : { type: "tool_result" as const, tool_use_id: b.toolUseId, content: b.content }
    ),
  };
}
