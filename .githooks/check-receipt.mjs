#!/usr/bin/env node
// Synako harness: receipt gate (run by .githooks/pre-commit).
//
// On agent branches (agent/* or claude/*) a commit is blocked unless
// .claude/receipts/receipt-<task-id>.json exists, has verdict "APPROVED",
// and its sha256 checksums match every staged file. Commits touching money or
// auth files also need reviewer.verdict "APPROVED".
// These are checksums, not a signature: they prove the receipt matches what is
// being committed, not who wrote it.
//
//   node .githooks/check-receipt.mjs                 # check (what the hook runs)
//   node .githooks/check-receipt.mjs --checksums     # print the "files" block for a receipt
//
// Env: HARNESS_ENFORCE=1 forces the check on any branch; HARNESS_TASK=<id> overrides the task id.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isHighStakes } from "../.claude/hooks/protected.mjs";

const git = (...a) => execFileSync("git", a, { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
const ROOT = git("rev-parse", "--show-toplevel").toString().trim();
const branch = git("branch", "--show-current").toString().trim();
const gated = /^(agent|claude)\//.test(branch) || process.env.HARNESS_ENFORCE === "1";
const taskId = process.env.HARNESS_TASK || branch.replace(/^(agent|claude)\//, "").replace(/[^\w.-]+/g, "-");
const receiptRel = `.claude/receipts/receipt-${taskId}.json`;

// Staged files -> sha256 of the staged content ("DELETED" for removals).
function stagedChecksums() {
  const out = git("diff", "--cached", "--name-status", "-z", "--no-renames").toString().split("\0").filter(Boolean);
  const files = {};
  for (let i = 0; i < out.length; i += 2) {
    const status = out[i], file = out[i + 1];
    if (file === receiptRel) continue; // the receipt can't contain its own checksum
    files[file] = status.startsWith("D") ? "DELETED" : createHash("sha256").update(git("show", `:${file}`)).digest("hex");
  }
  return files;
}

if (process.argv.includes("--checksums")) {
  process.stdout.write(JSON.stringify(stagedChecksums(), null, 2) + "\n");
  process.exit(0);
}

if (!gated) process.exit(0);

const fail = msg => {
  process.stderr.write(`\nCommit blocked by Synako receipt gate (branch ${branch}, task ${taskId}):\n${msg}\n` +
    `Write ${receiptRel} after running the "done when" checks. Get the files block with:\n` +
    `  node .githooks/check-receipt.mjs --checksums\n\n`);
  process.exit(1);
};

const receiptPath = path.join(ROOT, receiptRel);
if (!existsSync(receiptPath)) fail(`  no receipt at ${receiptRel}`);

let receipt;
try { receipt = JSON.parse(readFileSync(receiptPath, "utf8")); }
catch (e) { fail(`  receipt is not valid JSON (${e.message})`); }

if (receipt.verdict !== "APPROVED") fail(`  receipt verdict is ${JSON.stringify(receipt.verdict)}, not "APPROVED"`);

const staged = stagedChecksums();
const listed = receipt.files || {};
const problems = [];
for (const [f, sum] of Object.entries(staged)) {
  if (!(f in listed)) problems.push(`  ${f}: staged but not in the receipt`);
  else if (listed[f] !== sum) problems.push(`  ${f}: checksum mismatch (file changed after the receipt was written)`);
}
if (!Object.keys(staged).length) problems.push("  nothing staged besides the receipt");
if (problems.length) fail(problems.join("\n"));

const risky = Object.keys(staged).filter(isHighStakes);
if (risky.length && receipt.reviewer?.verdict !== "APPROVED")
  fail(`  high-stakes files staged (${risky.join(", ")}) but reviewer.verdict is not "APPROVED".\n` +
    `  Money and auth changes need an independent reviewer: see .claude/rules/high-stakes.md`);

process.stdout.write(`Receipt gate: ${receiptRel} OK (${Object.keys(staged).length} files${risky.length ? ", reviewer approved" : ""}).\n`);
