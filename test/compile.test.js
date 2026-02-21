import test from "node:test";
import assert from "node:assert/strict";
import { parseDocument } from "../src/syntax/parse.js";
import { compileScene } from "../src/compile/compile-scene.js";

test("parser accepts bare boolean flags and compiler emits ellipse/rect interactive fields", () => {
  const source = [
    "title Interactive Demo",
    "rect x=100 y=200 w=50 h=25 fill=#333 stroke=#eee resize drag",
    "ellipse x=400 y=300 rx=40 ry=20 fill=#090 stroke=#bfb resize drag"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 2);

  const rect = scene.primitives[0];
  assert.equal(rect.kind, "rect");
  assert.equal(rect.drag, true);
  assert.equal(rect.resize, true);
  assert.equal(rect.stroke, "#eee");

  const ellipse = scene.primitives[1];
  assert.equal(ellipse.kind, "ellipse");
  assert.equal(ellipse.drag, true);
  assert.equal(ellipse.resize, true);
  assert.equal(ellipse.rx, 40);
  assert.equal(ellipse.ry, 20);
});

test("axes block compiles with scoped children and interaction flags", () => {
  const source = [
    "title Axes Demo",
    "axes x=80 y=90 w=700 h=400 pan zoom drag resize",
    "  line x1=0 y1=0 x2=700 y2=0 stroke=#666 width=1",
    "  rect x=120 y=160 w=140 h=80 fill=#369 stroke=#fff"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);
  const axes = scene.primitives[0];

  assert.equal(axes.kind, "axes");
  assert.equal(axes.pan, true);
  assert.equal(axes.zoom, true);
  assert.equal(axes.drag, true);
  assert.equal(axes.resize, true);
  assert.equal(axes.children.length, 2);
  assert.equal(axes.children[1].kind, "rect");
});

test("for loop produces repeated primitives with variable substitution", () => {
  const source = [
    "for i=[0,2]",
    "  circle x=i y=0"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 3);
  assert.equal(scene.primitives[0].x, 0);
  assert.equal(scene.primitives[1].x, 1);
  assert.equal(scene.primitives[2].x, 2);
});

test("for loop with explicit step", () => {
  const source = [
    "for i=[0, 100, 50]",
    "  rect x=i y=0 w=10 h=10"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 3);
  assert.equal(scene.primitives[0].x, 0);
  assert.equal(scene.primitives[1].x, 50);
  assert.equal(scene.primitives[2].x, 100);
});

test("for loop inside axes", () => {
  const source = [
    "axes",
    "  for i=[0,1]",
    "    circle x=i y=i"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);
  const axes = scene.primitives[0];

  assert.equal(axes.kind, "axes");
  assert.equal(axes.children.length, 2);
  assert.equal(axes.children[0].x, 0);
  assert.equal(axes.children[1].x, 1);
});

test("nested for loops produce N*M primitives", () => {
  const source = [
    "for i=[0,2]",
    "  for j=[0,1]",
    "    circle x=i y=j"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 6);
  assert.equal(scene.primitives[0].x, 0);
  assert.equal(scene.primitives[0].y, 0);
  assert.equal(scene.primitives[1].x, 0);
  assert.equal(scene.primitives[1].y, 1);
  assert.equal(scene.primitives[4].x, 2);
  assert.equal(scene.primitives[4].y, 0);
});

test("each expansion substitutes variable.column references", () => {
  // Simulate what the resolve step does: attach data to a bind node
  const ast = parseDocument([
    "bind data=test.csv",
    "  each d in data",
    "    circle x=d.x y=d.y fill=d.c"
  ].join("\n"));

  // Manually attach parsed CSV data to the bind node (normally done by resolveBindings)
  ast.nodes[0].data = [
    { x: 10, y: 20, c: "#ff0" },
    { x: 30, y: 40, c: "#0ff" }
  ];

  const scene = compileScene(ast);
  assert.equal(scene.primitives.length, 2);
  assert.equal(scene.primitives[0].x, 10);
  assert.equal(scene.primitives[0].y, 20);
  assert.equal(scene.primitives[0].fill, "#ff0");
  assert.equal(scene.primitives[1].x, 30);
  assert.equal(scene.primitives[1].y, 40);
  assert.equal(scene.primitives[1].fill, "#0ff");
});

test("each inside axes produces children", () => {
  const ast = parseDocument([
    "bind data=test.csv",
    "  axes",
    "    each d in data",
    "      circle x=d.x y=d.y"
  ].join("\n"));

  ast.nodes[0].data = [
    { x: 5, y: 10 },
    { x: 15, y: 25 }
  ];

  const scene = compileScene(ast);
  const axes = scene.primitives[0];
  assert.equal(axes.kind, "axes");
  assert.equal(axes.children.length, 2);
  assert.equal(axes.children[0].x, 5);
  assert.equal(axes.children[1].x, 15);
});

test("for loop nested inside each", () => {
  const ast = parseDocument([
    "bind data=test.csv",
    "  each d in data",
    "    for i=[0,1]",
    "      circle x=d.x y=i"
  ].join("\n"));

  ast.nodes[0].data = [
    { x: 100 },
    { x: 200 }
  ];

  const scene = compileScene(ast);
  // 2 rows * 2 iterations = 4
  assert.equal(scene.primitives.length, 4);
  assert.equal(scene.primitives[0].x, 100);
  assert.equal(scene.primitives[0].y, 0);
  assert.equal(scene.primitives[1].x, 100);
  assert.equal(scene.primitives[1].y, 1);
  assert.equal(scene.primitives[2].x, 200);
  assert.equal(scene.primitives[2].y, 0);
});

test("text primitive parses quoted string and compiles with defaults", () => {
  const source = "text 'Hello world' x=100 y=50 font=monospace fontsize=16";

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 1);
  const t = scene.primitives[0];
  assert.equal(t.kind, "text");
  assert.equal(t.text, "Hello world");
  assert.equal(t.x, 100);
  assert.equal(t.y, 50);
  assert.equal(t.font, "monospace");
  assert.equal(t.fontSize, 16);
  assert.equal(t.w, 120);   // default
  assert.equal(t.h, 30);    // default
  assert.equal(t.ha, "left");
  assert.equal(t.va, "top");
  assert.equal(t.color, "#ffffff");
  assert.equal(t.drag, false);
  assert.equal(t.resize, false);
});

test("text primitive with double quotes and interaction flags", () => {
  const source = 'text "Hi there" x=10 y=20 w=200 h=40 ha=center va=middle color=#ff0 drag resize';

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  const t = scene.primitives[0];
  assert.equal(t.text, "Hi there");
  assert.equal(t.w, 200);
  assert.equal(t.h, 40);
  assert.equal(t.ha, "center");
  assert.equal(t.va, "middle");
  assert.equal(t.color, "#ff0");
  assert.equal(t.drag, true);
  assert.equal(t.resize, true);
});

test("text inside for loop substitutes variables", () => {
  const source = [
    "for i=[0,1]",
    "  text 'label' x=i y=0"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 2);
  assert.equal(scene.primitives[0].x, 0);
  assert.equal(scene.primitives[1].x, 1);
  assert.equal(scene.primitives[0].text, "label");
});

test("named primitives store name; line reference strings pass through for runtime resolution", () => {
  const source = [
    "rect name=node_a x=100 y=50 w=200 h=80",
    "circle name=node_b x=400 y=90 r=40",
    "line x1=node_a.bottom_middle.x y1=node_a.bottom_middle.y x2=node_b.top.x y2=node_b.top.y stroke=#888 width=2",
    "rect x=0 y=0 w=10 h=10"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].name, "node_a");
  assert.equal(scene.primitives[1].name, "node_b");
  assert.equal(scene.primitives[2].x1, "node_a.bottom_middle.x");
  assert.equal(scene.primitives[2].y1, "node_a.bottom_middle.y");
  assert.equal(scene.primitives[2].x2, "node_b.top.x");
  assert.equal(scene.primitives[2].y2, "node_b.top.y");
  assert.equal(scene.primitives[3].name, "");
});

test("text margin: global margin applies to all sides, per-side overrides global", () => {
  const source = [
    "text 'a' x=0 y=0",
    "text 'b' x=0 y=0 margin=8",
    "text 'c' x=0 y=0 margin=8 margintop=2 marginright=4"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  const a = scene.primitives[0];
  assert.equal(a.marginTop, 0);
  assert.equal(a.marginRight, 0);
  assert.equal(a.marginBottom, 0);
  assert.equal(a.marginLeft, 0);

  const b = scene.primitives[1];
  assert.equal(b.marginTop, 8);
  assert.equal(b.marginRight, 8);
  assert.equal(b.marginBottom, 8);
  assert.equal(b.marginLeft, 8);

  const c = scene.primitives[2];
  assert.equal(c.marginTop, 2);
  assert.equal(c.marginRight, 4);
  assert.equal(c.marginBottom, 8);
  assert.equal(c.marginLeft, 8);
});

test("text scroll flag compiles to scroll=true with scrollY=0, defaults to false", () => {
  const source = [
    "text 'a' x=0 y=0",
    "text 'b' x=0 y=0 scroll"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].scroll, false);
  assert.equal(scene.primitives[1].scroll, true);
  assert.equal(scene.primitives[1].scrollY, 0);
});

test("text zoom flag compiles to zoom=true, defaults to false", () => {
  const source = [
    "text 'short' x=0 y=0 w=100 h=30",
    "text 'long content here' x=0 y=50 w=100 h=80 zoom"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].zoom, false);
  assert.equal(scene.primitives[1].zoom, true);
});

test("each loop evaluates math expressions against row data", () => {
  const ast = parseDocument([
    "bind data=test.csv",
    "  each d in data",
    "    circle x=d.x*2 y=200-d.y r=sqrt(d.r)"
  ].join("\n"));

  ast.nodes[0].data = [
    { x: 10, y: 50, r: 16 },
    { x: 5,  y: 20, r: 4  }
  ];

  const scene = compileScene(ast);
  assert.equal(scene.primitives.length, 2);

  const p0 = scene.primitives[0];
  assert.equal(p0.x, 20);       // 10 * 2
  assert.equal(p0.y, 150);      // 200 - 50
  assert.equal(p0.r, 4);        // sqrt(16)

  const p1 = scene.primitives[1];
  assert.equal(p1.x, 10);       // 5 * 2
  assert.equal(p1.y, 180);      // 200 - 20
  assert.equal(p1.r, 2);        // sqrt(4)
});

test("each loop passes plain values and string columns through unchanged", () => {
  const ast = parseDocument([
    "bind data=test.csv",
    "  each d in data",
    "    circle x=d.x y=d.y fill=d.color"
  ].join("\n"));

  ast.nodes[0].data = [{ x: 30, y: 40, color: "#ff0000" }];

  const scene = compileScene(ast);
  const p = scene.primitives[0];
  assert.equal(p.x, 30);
  assert.equal(p.y, 40);
  assert.equal(p.fill, "#ff0000");
});

test("for loop evaluates math expressions against loop variable", () => {
  const source = [
    "for i=[1,3]",
    "  rect x=i*30 y=i**2 w=20 h=20"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 3);
  assert.equal(scene.primitives[0].x, 30);   // 1 * 30
  assert.equal(scene.primitives[0].y, 1);    // 1 ** 2
  assert.equal(scene.primitives[1].x, 60);   // 2 * 30
  assert.equal(scene.primitives[1].y, 4);    // 2 ** 2
  assert.equal(scene.primitives[2].x, 90);   // 3 * 30
  assert.equal(scene.primitives[2].y, 9);    // 3 ** 2
});

test("line route and handles flags compile correctly; reference strings pass through; cp1/cp2 start null", () => {
  const source = [
    "line x1=0 y1=0 x2=100 y2=100",
    "line x1=0 y1=0 x2=100 y2=100 route=cb",
    "line x1=0 y1=0 x2=100 y2=100 route=cubic-bezier handles",
    "line x1=node_a.bottom_middle.x y1=node_a.bottom_middle.y x2=node_b.top_middle.x y2=node_b.top_middle.y route=cb handles"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 4);

  const plain = scene.primitives[0];
  assert.equal(plain.route, "");
  assert.equal(plain.handles, false);
  assert.equal(plain.cp1, null);
  assert.equal(plain.cp2, null);

  const cb = scene.primitives[1];
  assert.equal(cb.route, "cb");
  assert.equal(cb.handles, false);
  assert.equal(cb.cp1, null);
  assert.equal(cb.cp2, null);

  const cbHandles = scene.primitives[2];
  assert.equal(cbHandles.route, "cubic-bezier");
  assert.equal(cbHandles.handles, true);

  const refLine = scene.primitives[3];
  assert.equal(refLine.route, "cb");
  assert.equal(refLine.handles, true);
  assert.equal(refLine.x1, "node_a.bottom_middle.x");
  assert.equal(refLine.y1, "node_a.bottom_middle.y");
  assert.equal(refLine.x2, "node_b.top_middle.x");
  assert.equal(refLine.y2, "node_b.top_middle.y");
});

test("line head/tail arrowheads compile correctly", () => {
  const source = [
    "line x1=0 y1=0 x2=100 y2=0",
    "line x1=0 y1=0 x2=100 y2=0 head",
    "line x1=0 y1=0 x2=100 y2=0 tail",
    "line x1=0 y1=0 x2=100 y2=0 head tail",
    "line x1=0 y1=0 x2=100 y2=0 head=open tail=diamond",
    "line x1=0 y1=0 x2=100 y2=0 head=circle arrowsize=14 arrowfill=#f00"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 6);

  const plain = scene.primitives[0];
  assert.equal(plain.head, false);
  assert.equal(plain.tail, false);
  assert.equal(plain.arrowSize, 10);
  assert.equal(plain.arrowFill, "");

  const headOnly = scene.primitives[1];
  assert.equal(headOnly.head, "filled");
  assert.equal(headOnly.tail, false);

  const tailOnly = scene.primitives[2];
  assert.equal(tailOnly.head, false);
  assert.equal(tailOnly.tail, "filled");

  const both = scene.primitives[3];
  assert.equal(both.head, "filled");
  assert.equal(both.tail, "filled");

  const typed = scene.primitives[4];
  assert.equal(typed.head, "open");
  assert.equal(typed.tail, "diamond");

  const styled = scene.primitives[5];
  assert.equal(styled.head, "circle");
  assert.equal(styled.arrowSize, 14);
  assert.equal(styled.arrowFill, "#f00");
});

test("reference strings pass through for x/y on all primitives", () => {
  const source = [
    "rect x=box.x y=box.y w=100 h=50",
    "circle x=box.center.x y=box.center.y r=10",
    "ellipse x=box.x y=box.y rx=20 ry=10",
    "text 'hi' x=box.top_middle.x y='box.top_middle.y - 20' w=80 h=20",
    "axes x=box.x y=box.y w=200 h=100"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives.length, 5);
  assert.equal(scene.primitives[0].x, "box.x");
  assert.equal(scene.primitives[0].y, "box.y");
  assert.equal(scene.primitives[1].x, "box.center.x");
  assert.equal(scene.primitives[1].y, "box.center.y");
  assert.equal(scene.primitives[2].x, "box.x");
  assert.equal(scene.primitives[3].x, "box.top_middle.x");
  assert.equal(scene.primitives[3].y, "box.top_middle.y - 20");
  assert.equal(scene.primitives[4].x, "box.x");
});

test("origin attribute compiles on rect, text, axes; defaults to top_left", () => {
  const source = [
    "rect x=100 y=100 w=80 h=40",
    "rect x=100 y=100 w=80 h=40 origin=center",
    "text 'hi' x=200 y=200 w=80 h=20 origin=top_middle",
    "axes x=50 y=50 w=300 h=200 origin=bottom_left"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].origin, "top_left");
  assert.equal(scene.primitives[1].origin, "center");
  assert.equal(scene.primitives[2].origin, "top_middle");
  assert.equal(scene.primitives[3].origin, "bottom_left");
});

test("quoted values in key=value params pass through as strings", () => {
  const source = "rect x='box.x + 10' y='box.center.y - 5' w=50 h=30";

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].x, "box.x + 10");
  assert.equal(scene.primitives[0].y, "box.center.y - 5");
});

test("variable definitions substitute into any value position", () => {
  const source = [
    "fg=#94a3b8",
    "bg=#0f172a",
    "sz=14",
    "rect x=0 y=0 w=100 h=50 fill=bg stroke=fg",
    "text 'hi' x=0 y=0 w=80 h=20 color=fg fontsize=sz"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].fill, "#0f172a");
  assert.equal(scene.primitives[0].stroke, "#94a3b8");
  assert.equal(scene.primitives[1].color, "#94a3b8");
  assert.equal(scene.primitives[1].fontSize, 14);
});

test("anchor abbreviations expand in plain values and origin", () => {
  const source = [
    "rect x=0 y=0 w=100 h=50 origin=_bm",
    "rect x=0 y=0 w=100 h=50 origin=_tl",
    "rect x=0 y=0 w=100 h=50 origin=_c",
    "rect x=box._tm.x y=box._ml.y w=50 h=30"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].origin, "bottom_middle");
  assert.equal(scene.primitives[1].origin, "top_left");
  assert.equal(scene.primitives[2].origin, "center");
  assert.equal(scene.primitives[3].x, "box.top_middle.x");
  assert.equal(scene.primitives[3].y, "box.middle_left.y");
});

test("anchor abbreviations expand inside quoted expressions", () => {
  const source = "rect x='box._tm.x - 10' y='box._bm.y + 5' w=50 h=30";

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].x, "box.top_middle.x - 10");
  assert.equal(scene.primitives[0].y, "box.bottom_middle.y + 5");
});

test("l attribute expands to x/y from anchor ref", () => {
  const source = [
    "rect l=box._tm w=100 h=30",
    "circle l=node r=5"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].x, "box.top_middle.x");
  assert.equal(scene.primitives[0].y, "box.top_middle.y");
  assert.equal(scene.primitives[1].x, "node.x");
  assert.equal(scene.primitives[1].y, "node.y");
});

test("l attribute with comma expands to numeric x/y", () => {
  const source = "rect l=100,200 w=50 h=30";

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  assert.equal(scene.primitives[0].x, 100);
  assert.equal(scene.primitives[0].y, 200);
});

test("l1/l2 expand to x1/y1 and x2/y2 for lines", () => {
  const source = "line l1=a._bm l2=b._tm stroke=#fff";

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  const line = scene.primitives[0];
  assert.equal(line.x1, "a.bottom_middle.x");
  assert.equal(line.y1, "a.bottom_middle.y");
  assert.equal(line.x2, "b.top_middle.x");
  assert.equal(line.y2, "b.top_middle.y");
});

test("explicit x/y take precedence over l", () => {
  const source = "rect l=box._tm x=99 w=50 h=30";

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  // x=99 was explicit, so l only sets y
  assert.equal(scene.primitives[0].x, 99);
  assert.equal(scene.primitives[0].y, "box.top_middle.y");
});

test("variables and abbreviations compose: variable value uses abbreviation; abbrev in ref", () => {
  const source = [
    "c=#94a3b8",
    "fa=#0f172a",
    "text 'hi' l=plot._tm w=320 h=22 origin=_bm color=c fill=fa"
  ].join("\n");

  const ast = parseDocument(source);
  const scene = compileScene(ast);

  const t = scene.primitives[0];
  assert.equal(t.x, "plot.top_middle.x");
  assert.equal(t.y, "plot.top_middle.y");
  assert.equal(t.origin, "bottom_middle");
  assert.equal(t.color, "#94a3b8");
  assert.equal(t.fill, "#0f172a");
});

test("hover: tokens are collected into a hover sub-object", () => {
  const source = "circle x=10 y=20 r=5 fill=#3b82f6 hover:fill=#60a5fa hover:r=8";
  const ast = parseDocument(source);
  const scene = compileScene(ast);

  const c = scene.primitives[0];
  assert.equal(c.fill, "#3b82f6");
  assert.deepEqual(c.hover, { fill: "#60a5fa", r: 8 });
});

test("each-loop primitives are tagged with _collection and _eachIndex", () => {
  const source = [
    "bind rows=test-data.csv",
    "  axes x=0 y=0 w=200 h=200",
    "    each r in rows",
    "      circle x=10 y=10 r=5 fill=#3b82f6 hover:fill=#60a5fa"
  ].join("\n");

  // Inject data directly
  const ast = parseDocument(source);
  // Manually supply data to the bind node
  const bindNode = ast.nodes[0];
  bindNode.data = [{ x: 1 }, { x: 2 }, { x: 3 }];

  const scene = compileScene(ast);
  const children = scene.primitives[0].children;
  assert.equal(children.length, 3);
  assert.equal(children[0]._collection, "rows");
  assert.equal(children[0]._eachIndex, 0);
  assert.equal(children[1]._eachIndex, 1);
  assert.equal(children[2]._eachIndex, 2);
  assert.deepEqual(children[0].hover, { fill: "#60a5fa" });
});

