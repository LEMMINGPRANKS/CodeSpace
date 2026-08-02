// The agent loop. Send messages to LLM, execute any tool calls, feed results
// back, repeat until LLM stops calling tools.
import type { LLMProvider, Message, AssistantContent, UserContent } from "./providers/types.js";
import { execute, listToolSchemas } from "./tools/types.js";

export interface AgentOptions {
  provider: LLMProvider;
  maxToolRounds?: number;  // safety valve — never loop forever
  onAssistant?: (blocks: AssistantContent[]) => void;
}

export async function runAgent(
  history: Message[],
  userText: string,
  opts: AgentOptions,
): Promise<void> {
  // Append the user's new message.
  history.push({ role: "user", content: [{ type: "text", text: userText }] });

  const tools = listToolSchemas();
  const maxRounds = opts.maxToolRounds ?? 25;

  for (let round = 0; round < maxRounds; round++) {
    const resp = await opts.provider.chat(history, tools);
    history.push({ role: "assistant", content: resp.content });

    // Surface text to UI.
    const text = resp.content
      .filter(b => b.type === "text")
      .map(b => (b as { text: string }).text)
      .join("");
    if (text && opts.onAssistant) opts.onAssistant(resp.content);

    if (resp.stopReason !== "tool_use") return;

    // Execute each tool call, collect results into a single user message.
    const toolUses = resp.content.filter(b => b.type === "tool_use") as Extract<AssistantContent, { type: "tool_use" }>[];
    const results: UserContent[] = [];
    for (const t of toolUses) {
      process.stdout.write(`\x1b[90m  → ${t.name}(${JSON.stringify(t.input)})\x1b[0m\n`);
      const content = await execute(t.name, t.input);
      process.stdout.write(`\x1b[90m  ← ${truncate(content, 200)}\x1b[0m\n`);
      results.push({ type: "tool_result", toolUseId: t.id, content });
    }
    history.push({ role: "user", content: results });
  }
  process.stdout.write("\x1b[33m  ⚠ hit max tool rounds, stopping.\x1b[0m\n");
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
