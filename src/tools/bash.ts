// Bash tool — runs a shell command in the project cwd and returns stdout+stderr.
import { exec } from "node:child_process";
import { registerTool } from "./types.js";

registerTool({
  name: "run_bash",
  description: "Run a bash command in the current working directory. Returns combined stdout+stderr (truncated to 8000 chars).",
  input_schema: {
    type: "object",
    properties: {
      command: { type: "string", description: "The bash command to execute." },
      timeout_ms: { type: "number", description: "Optional timeout in ms. Default 30000.", default: 30000 },
    },
    required: ["command"],
  },
  run(input) {
    const cmd = String(input.command);
    const timeout = Number(input.timeout_ms) || 30000;
    return new Promise((resolve) => {
      exec(cmd, {
        cwd: process.cwd(),
        timeout,
        maxBuffer: 1024 * 1024,
      }, (err, stdout, stderr) => {
        let out = "";
        if (stdout) out += stdout;
        if (stderr) out += (out ? "\n[stderr]\n" : "") + stderr;
        if (err && !stdout && !stderr) out += `Error: ${err.message}`;
        if (out.length > 8000) out = out.slice(0, 8000) + `\n... (truncated, ${out.length - 8000} chars cut)`;
        resolve(out || "(no output)");
      });
    });
  },
});
