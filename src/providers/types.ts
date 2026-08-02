// Provider-agnostic LLM interface. Each adapter (Anthropic, OpenAI, etc.)
// implements this. The agent loop only ever calls these methods — it never
// touches provider-specific SDK types directly.

export type Role = "user" | "assistant";

export interface TextPart { type: "text"; text: string }
export interface ToolUsePart {
  type: "tool_use";
  id: string;        // unique id from the LLM, used to match results back
  name: string;      // tool name (must exist in our registry)
  input: Record<string, unknown>;
}
export interface ToolResultPart {
  type: "tool_result";
  toolUseId: string;
  content: string;   // plain text we feed back to the LLM
  isError?: boolean;
}

export type AssistantContent = TextPart | ToolUsePart;
export type UserContent = TextPart | ToolResultPart;

export interface Message {
  role: Role;
  content: UserContent[] | AssistantContent[];
}

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;  // JSON schema
}

export interface LLMResponse {
  // What the assistant said in this turn. May be empty if it only called tools.
  content: AssistantContent[];
  // True if the assistant asked for tools (loop continues).
  // False if it just produced text — the turn is finished.
  stopReason: "tool_use" | "end_turn" | "max_tokens" | "error";
}

export interface LLMProvider {
  name: string;
  // Send the conversation so far + available tools, get one assistant turn.
  chat(messages: Message[], tools: ToolSchema[]): Promise<LLMResponse>;
}
