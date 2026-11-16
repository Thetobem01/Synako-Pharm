#!/usr/bin/env node
// Synako harness: PreToolUse guard.
// Claude Code sends the tool call as JSON on stdin. Exit 2 blocks the call and
// stderr is shown to the agent. Exit 0 lets it through. Plain script, no model call.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { neverWriteReason } from "./protected.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function block(msg) {
  process.stderr.write(`Blocked by Synako harness: ${msg}\nSee .claude/rules/ and CLAUDE.md. Ask Tobe if this change is really needed.\n`);
  process.exit(2);
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  block("could not read the tool call (malformed JSON). Failing closed.");
}

const tool = input.tool_name || "";
const ti = input.tool_input || {};

// Repo-relative path, or null if outside the repo.
function rel(p) {
  if (!p) return null;
  const abs = path.resolve(input.cwd || ROOT, p);
  const r = path.relative(ROOT, abs);
  if (r.startsWith("..") || path.isAbsolute(r)) return null;
  return r.split(path.sep).join("/");
}
const inTmp = p => {
  const abs = path.resolve(input.cwd || ROOT, p);
  return [os.tmpdir(), "/tmp", "/private/tmp"].some(t => abs === t || abs.startsWith(t + path.sep));
};
const isEnvFile = r => /(^|\/)\.env($|\.(?!example$)[^/]*$)/.test(r);

// ---- File tools ----
if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool)) {
  const p = ti.file_path || ti.notebook_path;
  const r = rel(p);
  if (r === null) {
    if (p && inTmp(p)) process.exit(0);
    block(`writing outside the repository (${p}). Stay inside the task's write list.`);
  }
  const why = neverWriteReason(r);
  if (why) block(`${r} is protected: ${why}`);
  process.exit(0);
}

if (tool === "Read") {
  const r = rel(ti.file_path);
  if (r !== null && isEnvFile(r)) block(`${r} holds secrets and must not be read into the conversation.`);
  process.exit(0);
}

// ---- Shell ----
if (tool === "Bash") {
  const cmd = String(ti.command || "");
  const branch = (() => {
    try { return execFileSync("git", ["-C", ROOT, "branch", "--show-current"], { encoding: "utf8" }).trim(); }
    catch { return ""; }
  })();

  // Secrets: no reading .env files through the shell either.
  if (/(^|[\s'"=/<])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'";|&>)])/.test(cmd))
    block("the command touches a .env file. Secrets stay in the Vercel dashboard.");

  // Git: no commits to main, no skipping the receipt gate, no pushing to main.
  for (const seg of cmd.split(/&&|\|\||;|\n/)) {
    const s = seg.trim();
    if (/\bgit\b.*\bcommit\b/.test(s)) {
      if (/\s--no-verify\b/.test(s) || /\scommit\b.*\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/.test(s))
        block("`git commit --no-verify` skips the receipt gate.");
      if (branch === "main" || branch === "master")
        block(`committing directly on ${branch}. Work on agent/<task-id> instead.`);
    }
    if (/\bgit\b.*\bpush\b/.test(s)) {
      if (/(\s|:|\/)(main|master)(\s|$)/.test(s)) block("pushing to main. Open a pull request instead.");
      if (branch === "main" || branch === "master") block(`pushing while on ${branch}. Open a pull request instead.`);
      if (/\s(--force|-f)(\s|$)/.test(s) && !/--force-with-lease/.test(s)) block("force-push. Use --force-with-lease on your own agent branch if you must.");
    }
    if (/\bgit\b.*\bconfig\b.*core\.hookspath/i.test(s)) block("changing core.hooksPath would switch off the receipt gate.");
    if (/\bvercel\b/.test(s) && /(\s--prod\b|\s--production\b|\s(env|promote|rollback|remove|rm|alias|domains|secrets)\b)/.test(s))
      block("production deploys and Vercel settings are Tobe's call, not an agent's.");
  }

  // Shell writes to protected files (best effort: catches the common forms).
  const writes = /(>|\btee\b|\bsed\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*i|\bperl\s+-[a-zA-Z]*i|\bmv\b|\bcp\b|\brm\b|\btruncate\b|\bchmod\b|\bln\b|\bdd\b|\bgit\s+(checkout|restore|rm|mv)\b)/;
  if (writes.test(cmd)) {
    for (const tok of cmd.split(/[\s;|&<>()]+/)) {
      const t = tok.replace(/^['"]|['"]$/g, "").replace(/^of=/, "");
      if (!t || t.startsWith("-")) continue;
      const r = rel(t);
      if (r === null) continue;
      const why = neverWriteReason(r);
      if (why) block(`the command would modify ${r}: ${why}`);
    }
  }
  process.exit(0);
}

process.exit(0);
