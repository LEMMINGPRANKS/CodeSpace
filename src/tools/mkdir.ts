// mkdir tool — creates a directory (and any missing parents).
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { registerTool } from "./types.js";

registerTool({
  name: "make_dir",
  description: "Create a directory. Recursively creates parents if missing. No error if it already exists.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Directory path to create (relative or absolute)." },
      mode: { type: "number", description: "Optional octal mode, e.g. 0o755. Default 0o755." },
    },
    required: ["path"],
  },
  async run(input) {
    const p = String(input.path);
    const abs = path.resolve(process.cwd(), p);
    const mode = typeof input.mode === "number" ? input.mode : 0o755;
    await fs.mkdir(abs, { recursive: true, mode });
    return `Created ${p}`;
  },
});
