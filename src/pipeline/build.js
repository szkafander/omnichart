import { parseDocument } from "../syntax/parse.js";
import { resolveBindings } from "../data/resolve.js";
import { compileScene } from "../compile/compile-scene.js";
import { emitHtmlDocument } from "../emit/emit-html.js";

export async function buildFromSource(source, options = {}) {
  const ast = parseDocument(source, options);
  await resolveBindings(ast, options);
  const scene = compileScene(ast, options);
  return emitHtmlDocument(scene, options);
}
