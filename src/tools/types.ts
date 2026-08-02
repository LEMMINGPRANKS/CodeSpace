// Tool registry. Each tool: { name, description, schema, run }.
// The agent loop calls `execute(name, input)` when the LLM asks for a tool.

import type { ToolSchema } from "../providers/types.js";

export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  run(input: Record<string, unknown>): Promise<string>;
}

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool) {
  registry.set(tool.name, tool);
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

export function listToolSchemas(): ToolSchema[] {
  return Array.from(registry.values()).map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
}

export async function execute(name: string, input: Record<string, unknown>): Promise<string> {
  const tool = registry.get(name);
  if (!tool) return `Error: unknown tool "${name}"`;
  try {
    return await tool.run(input);
  } catch (err: any) {
    return `Error running ${name}: ${err?.message || String(err)}`;
  }
}
