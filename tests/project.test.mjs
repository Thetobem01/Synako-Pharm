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
