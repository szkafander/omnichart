import { evaluateExpr } from "./expr.js";

export function compileScene(ast) {
  let title = "omnichart";

  for (const directive of ast.directives) {
    if (directive.type === "title") {
      title = directive.tokens.join(" ");
    }
  }

  const nodes = ast.nodes ?? [];
  const primitives = expandNodes(nodes, {});
  return {
    version: 1,
    meta: { title },
    primitives
  };
}

function expandNodes(nodes, scope) {
  return nodes.flatMap((node) => {
    if (node.type === "for") return expandFor(node, scope);
    if (node.type === "bind") return expandBind(node, scope);
    if (node.type === "each") return expandEach(node, scope);
    return [normalizeNode(node, scope)];
  });
}

function expandBind(node, scope) {
  const newScope = { ...scope, [node.name]: node.data };
  return expandNodes(node.children, newScope);
}

function expandEach(node, scope) {
  const data = scope[node.collection];
  if (!data) {
    throw new Error(`each: collection "${node.collection}" not found in scope`);
  }

  const results = [];
  for (let i = 0; i < data.length; i++) {
    const substituted = node.children.map((child) =>
      substituteEachNode(child, node.variable, data[i])
    );
    const expanded = expandNodes(substituted, scope);
    for (const prim of expanded) {
      prim._collection = node.collection;
      prim._eachIndex = i;
    }
    results.push(...expanded);
  }
  return results;
}

function expandFor(node, scope) {
  const results = [];
  for (let v = node.start; v <= node.end; v += node.step) {
    const substituted = node.children.map((child) =>
      substituteNode(child, node.variable, v)
    );
    results.push(...expandNodes(substituted, scope));
  }
  return results;
}

function substituteNode(node, variable, value) {
  const clone = { ...node };
  if (clone.params) {
    clone.params = {};
    const wordRe = new RegExp(`\\b${variable}\\b`);
    for (const [k, v] of Object.entries(node.params)) {
      if (v === variable) {
        clone.params[k] = value;
      } else if (typeof v === "string" && wordRe.test(v)) {
        clone.params[k] = evaluateExpr(v, { [variable]: value });
      } else {
        clone.params[k] = v;
      }
    }
  }
  if (clone.children) {
    clone.children = node.children.map((c) => substituteNode(c, variable, value));
  }
  return clone;
}

function substituteEachNode(node, variable, row) {
  const clone = { ...node };
  if (clone.params) {
    clone.params = {};
    const prefix = variable + ".";
    for (const [k, v] of Object.entries(node.params)) {
      if (typeof v === "string" && v.includes(prefix)) {
        clone.params[k] = evaluateExpr(v, { [variable]: row });
      } else {
        clone.params[k] = v;
      }
    }
  }
  if (clone.children) {
    clone.children = node.children.map((c) => substituteEachNode(c, variable, row));
  }
  return clone;
}

function normalizeNode(node, scope) {
  if (node.type === "axes") {
    return {
      kind: "axes",
      name: stringOr(node.params.name, ""),
      x: node.params.x ?? 40,
      y: node.params.y ?? 40,
      w: node.params.w ?? 500,
      h: node.params.h ?? 300,
      fill: stringOr(node.params.fill, "#101010"),
      stroke: stringOr(node.params.stroke, "#555"),
      strokeWidth: numberOr(node.params.strokeWidth, 1),
      origin: stringOr(node.params.origin, "top_left"),
      hover: node.params.hover || null,
      pan: boolOr(node.params.pan, false),
      zoom: boolOr(node.params.zoom, false),
      drag: boolOr(node.params.drag, false),
      resize: boolOr(node.params.resize, false),
      view: { tx: 0, ty: 0, scale: 1 },
      children: expandNodes(node.children ?? [], scope)
    };
  }

  if (node.type === "shape") {
    return normalizePrimitive(node);
  }

  throw new Error(`Unknown AST node type: ${node.type}`);
}

function normalizePrimitive(shapeNode) {
  const p = shapeNode.params;

  if (shapeNode.shape === "circle") {
    return {
      kind: "circle",
      name: stringOr(p.name, ""),
      x: p.x ?? 0,
      y: p.y ?? 0,
      r: p.r ?? 2,
      fill: stringOr(p.fill, "#1f77b4"),
      drag: boolOr(p.drag, false),
      resize: boolOr(p.resize, false),
      hover: p.hover || null
    };
  }

  if (shapeNode.shape === "rect") {
    return {
      kind: "rect",
      name: stringOr(p.name, ""),
      x: p.x ?? 0,
      y: p.y ?? 0,
      w: p.w ?? 10,
      h: p.h ?? 10,
      fill: stringOr(p.fill, "#2ca02c"),
      stroke: stringOr(p.stroke, ""),
      strokeWidth: numberOr(p.strokeWidth, 1),
      origin: stringOr(p.origin, "top_left"),
      drag: boolOr(p.drag, false),
      resize: boolOr(p.resize, false),
      hover: p.hover || null
    };
  }

  if (shapeNode.shape === "ellipse") {
    return {
      kind: "ellipse",
      name: stringOr(p.name, ""),
      x: p.x ?? 0,
      y: p.y ?? 0,
      rx: p.rx ?? (numberOr(p.w, 20) / 2),
      ry: p.ry ?? (numberOr(p.h, 12) / 2),
      fill: stringOr(p.fill, "#ed8936"),
      stroke: stringOr(p.stroke, ""),
      strokeWidth: numberOr(p.strokeWidth, 1),
      drag: boolOr(p.drag, false),
      resize: boolOr(p.resize, false),
      hover: p.hover || null
    };
  }

  if (shapeNode.shape === "text") {
    const margin = numberOr(p.margin, 0);
    return {
      kind: "text",
      name: stringOr(p.name, ""),
      text: stringOr(p.text, ""),
      x: p.x ?? 0,
      y: p.y ?? 0,
      w: p.w ?? 120,
      h: p.h ?? 30,
      fill: stringOr(p.fill, ""),
      stroke: stringOr(p.stroke, ""),
      strokeWidth: numberOr(p.strokeWidth, 1),
      color: stringOr(p.color, "#ffffff"),
      font: stringOr(p.font, "sans-serif"),
      fontSize: numberOr(p.fontsize, 14),
      ha: stringOr(p.ha, "left"),
      va: stringOr(p.va, "top"),
      marginTop: numberOr(p.margintop, margin),
      marginRight: numberOr(p.marginright, margin),
      marginBottom: numberOr(p.marginbottom, margin),
      marginLeft: numberOr(p.marginleft, margin),
      origin: stringOr(p.origin, "top_left"),
      drag: boolOr(p.drag, false),
      resize: boolOr(p.resize, false),
      zoom: boolOr(p.zoom, false),
      scroll: boolOr(p.scroll, false),
      scrollY: 0,
      hover: p.hover || null
    };
  }

  if (shapeNode.shape === "line") {
    return {
      kind: "line",
      name: stringOr(p.name, ""),
      x1: p.x1 ?? 0,
      y1: p.y1 ?? 0,
      x2: p.x2 ?? 0,
      y2: p.y2 ?? 0,
      stroke: stringOr(p.stroke, "#444"),
      width: numberOr(p.width, 1),
      route: stringOr(p.route, ""),
      handles: boolOr(p.handles, false),
      head: p.head === true ? "filled" : (typeof p.head === "string" ? p.head : false),
      tail: p.tail === true ? "filled" : (typeof p.tail === "string" ? p.tail : false),
      arrowSize: numberOr(p.arrowsize, 10),
      arrowFill: stringOr(p.arrowfill, ""),
      cp1: null,
      cp2: null,
      hover: p.hover || null
    };
  }

  throw new Error(`Unknown shape: ${shapeNode.shape}`);
}

function numberOr(input, fallback) {
  return typeof input === "number" ? input : fallback;
}

function stringOr(input, fallback) {
  return typeof input === "string" ? input : fallback;
}

function boolOr(input, fallback) {
  return typeof input === "boolean" ? input : fallback;
}
