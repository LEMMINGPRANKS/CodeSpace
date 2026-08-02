// Bash tool — runs a shell command in the project cwd and returns stdout+stderr.
// Network and destructive commands are blocked to keep the agent sandboxed.
import { exec } from "node:child_process";
import { registerTool } from "./types.js";

// Tokens that should never appear in an agent-issued command. Matched as
// whole words (so `rm` is fine but `curl` is not, even inside `curl http://...`).
// Build the regex once.
const DENY = [
  "curl", "wget", "nc", "netcat", "ncat", "telnet", "ftp", "sftp", "scp",
  "rsync", "ssh", "mosh",
  "sudo", "su", "doas",
  "dd", "mkfs", "fdisk", "parted", "shred",
  "shutdown", "reboot", "poweroff", "halt",
  "systemctl", "service", "init",
  "crontab", "at",
  "chmod", "chown", "chattr", "setfacl", "umask",
  "kill", "killall", "pkill", "pgrep",
  "iptables", "ufw", "firewall-cmd",
  "mount", "umount", "losetup",
  "env", "export", "set",
  "history",
  // Bypass tricks
  "eval", "source", "\\bsource\\b",
];
const DENY_RE = new RegExp(`(^|[\\s;&|<>(])(${DENY.join("|")})(\\b)`);

// Extra patterns for the dangerous combos that the word-list might miss.
const DENY_PATTERNS: RegExp[] = [
  /\brm\s+-[rRfF]*[rRfF][rRfF]*\s+\/(\s|$)/,        // rm -rf /
  /\brm\s+-[rRfF]*[rRfF][rRfF]*\s+~/,                // rm -rf ~
  /\brm\s+-[rRfF]*[rRfF][rRfF]*\s+\$HOME/,
  /\|\s*(bash|sh|zsh|fish)\b/,                        // pipe-to-shell exfil
  />\s*\/dev\/(tcp|udp)\//,                           // /dev/tcp exfil
  /`(curl|wget|nc|ssh|scp)\b/,                        // backtick command sub
  /\$\((curl|wget|nc|ssh|scp)\b/,                     // $(...) command sub
];

registerTool({
  name: "run_bash",
  description: "Run a bash command in the current working directory. Returns combined stdout+stderr (truncated to 8000 chars). Network calls (curl, wget, ssh, etc.) and system-modifying commands (sudo, dd, shutdown, etc.) are blocked.",
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
    const denyMatch = DENY_RE.exec(cmd);
    const patternMatch = DENY_PATTERNS.find(re => re.test(cmd));
    if (denyMatch || patternMatch) {
      const matched = denyMatch ? denyMatch[0] : (patternMatch as RegExp).source;
      return Promise.resolve(
        `Error: this command is blocked for safety. Matched: "${matched}". ` +
        `CodeSpace doesn't allow network or system-modifying commands.`
      );
    }
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
