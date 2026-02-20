import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFromSource } from "../src/pipeline/build.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("buildFromSource emits html and includes runtime bootstrap", async () => {
  const sourcePath = path.resolve(__dirname, "../examples/scatter.oc");
  const source = await readFile(sourcePath, "utf8");
  const html = await buildFromSource(source, { sourcePath });

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /OMNICHART_RUNTIME/);
  assert.match(html, /<canvas id="ocanvas" aria-label="[^"]+"><\/canvas>/);
});


