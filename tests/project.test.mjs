/* Checks on the project layout that the hosting depends on */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const functions = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (e.name.startsWith("_") ? [] : functions(path.join(dir, e.name))) : e.name.endsWith(".js") && !e.name.startsWith("_") ? [path.join(dir, e.name)] : []);

test("the API fits Vercel Hobby's limit of 12 serverless functions", () => {
  const list = functions("api");
  assert.ok(list.length <= 12, `api/ has ${list.length} functions (${list.join(", ")}); Vercel Hobby deploys at most 12. Merge an endpoint into an existing file instead of adding one.`);
});

test("hosting settings are found with or without a Marketplace prefix", async () => {
  const { setting } = await import("../api/_lib/core.js");
  const keys = ["KV_REST_API_TOKEN", "storage_KV_REST_API_TOKEN", "storage_KV_REST_API_READ_ONLY_TOKEN", "messaging_RESEND_API_KEY"];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    keys.forEach(k => delete process.env[k]);
    process.env.storage_KV_REST_API_READ_ONLY_TOKEN = "read-only";
    assert.equal(setting("KV_REST_API_TOKEN"), "", "the read-only token must never be used for writes");
    process.env.storage_KV_REST_API_TOKEN = "prefixed";
    assert.equal(setting("KV_REST_API_TOKEN"), "prefixed");
    process.env.KV_REST_API_TOKEN = "plain";
    assert.equal(setting("KV_REST_API_TOKEN"), "plain", "an unprefixed setting wins");
    process.env.messaging_RESEND_API_KEY = "re_x";
    assert.equal(setting("RESEND_API_KEY"), "re_x");
  } finally {
    keys.forEach(k => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
  }
});
