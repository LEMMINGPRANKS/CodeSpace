// File tools: read_file, write_file, list_files.
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { registerTool } from "./types.js";

registerTool({
  name: "read_file",
  description: "Read the full contents of a file at the given path (relative or absolute). Returns the text content.",
  input_schema: {
    type: "object",
    properties: { path: { type: "string", description: "Path to the file to read." } },
    required: ["path"],
  },
  async run(input) {
    const p = String(input.path);
    const abs = path.resolve(process.cwd(), p);
    const data = await fs.readFile(abs, "utf8");
    return data;
  },
});

registerTool({
  name: "write_file",
  description: "Write text content to a file. Overwrites if it exists, creates if not.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to write." },
      content: { type: "string", description: "The full text content to write." },
    },
    required: ["path", "content"],
  },
  async run(input) {
    const p = String(input.path);
    const content = String(input.content);
    const abs = path.resolve(process.cwd(), p);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
    return `Wrote ${content.length} chars to ${p}`;
  },
});

registerTool({
  name: "list_files",
  description: "List files and folders in a directory (non-recursive). Returns one entry per line.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Directory to list. Defaults to cwd.", default: "." },
    },
  },
  async run(input) {
    const p = input.path ? String(input.path) : ".";
    const abs = path.resolve(process.cwd(), p);
    const entries = await fs.readdir(abs, { withFileTypes: true });
    if (entries.length === 0) return "(empty directory)";
    return entries
      .map(e => (e.isDirectory() ? e.name + "/" : e.name))
      .sort()
      .join("\n");
  },
});
