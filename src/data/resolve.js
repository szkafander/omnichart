import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "./csv.js";

export async function resolveBindings(ast, options = {}) {
  const nodes = ast.nodes ?? [];
  await resolveNodes(nodes, options);
}

async function resolveNodes(nodes, options) {
  for (const node of nodes) {
    if (node.type === "bind") {
      const text = await loadText(node.path, options);
      node.data = parseCsv(text);
    }
    if (node.children) {
      await resolveNodes(node.children, options);
    }
  }
}

async function loadText(filePath, options) {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
    return res.text();
  }

  const base = options.sourcePath ? path.dirname(options.sourcePath) : process.cwd();
  return readFileSync(path.resolve(base, filePath), "utf8");
}
