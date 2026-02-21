import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const partNames = [
  "draw.js",
  "axes.js", "circle.js", "rect.js", "ellipse.js", "text.js", "line.js",
  "geometry.js", "interaction.js", "resize.js", "handlers.js"
];
const parts = partNames.map(name => readFileSync(path.join(__dirname, "parts", name), "utf8"));

export const browserRuntimeSource = [
  "(function () {",
  "  function render(canvas, scene) {",
  '    var ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });',
  '    if (!ctx) throw new Error("Unable to acquire 2D context.");',
  "    var handleRadius = 8;",
  "    var minSize = 8;",
  "    var state = {",
  "      mode: null,",
  "      primitive: null,",
  "      axes: null,",
  "      handle: null,",
  "      hoverPrimitive: null,",
  "      hoverAxes: null,",
  "      hoverDisplay: null,",
  "      hoveredEach: null,",
  "      startX: 0,",
  "      startY: 0,",
  "      startLocalX: 0,",
  "      startLocalY: 0,",
  "      toLocal: null,",
  "      axesParentScale: 1,",
  "      snapshot: null,",
  "      handleVisibleFor: null",
  "    };",
  "",
  ...parts,
  "",
  "    // Build a live name→primitive index so anchor references resolve against",
  "    // the actual runtime objects (not JSON copies).",
  "    scene.names = {};",
  "    (function indexNames(list) {",
  "      for (var i = 0; i < list.length; i++) {",
  "        var p = list[i];",
  "        if (p.name) scene.names[p.name] = p;",
  "        if (p.children) indexNames(p.children);",
  "      }",
  "    })(scene.primitives);",
  "",
  "    draw();",
  '    window.addEventListener("resize", draw, { passive: true });',
  '    canvas.addEventListener("pointerdown", onPointerDown);',
  '    canvas.addEventListener("pointermove", onPointerMove);',
  '    canvas.addEventListener("pointerup", onPointerUp);',
  '    canvas.addEventListener("pointerleave", onPointerLeave);',
  '    canvas.addEventListener("wheel", onWheel, { passive: false });',
  "  }",
  "",
  "  window.OMNICHART_RUNTIME = { render: render };",
  "})();",
  ""
].join("\n");
