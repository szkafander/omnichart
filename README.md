# omnichart

`omnichart` is a lightweight JavaScript package for generating static HTML graphics from a compact mini-language.

## Why

Currently (February 2026), there is no single lightweight solution that can:
- Draw and handle typical plots (scatter, line, bar...)
- Draw and handle graphs (nodes, edges, layouts...)
- Handle interaction
- Do it performantly
- Do it without having to install binaries, servers or runtimes

## Workflow

1. Write a chart/graphic in the mini-language (`.oc` file).
2. Run the CLI to compile it into a standalone `.html` file.
3. Open the output in any modern browser.

## Goals

- Render up to tens of thousands of primitives efficiently.
- Keep the mini-language intuitive and low-verbosity.
- Minimize dependencies and keep code readable.

## Quick start

```bash
node ./bin/omnichart.js build ./examples/scatter.oc -o ./out/scatter.html
open ./out/scatter.html
```

## Roadmap

- Mini-language and parsing
- Basic primitives
    - `rect`
    - `line`
    - `edge`
    - `circle`
    - `ellipse`
    - `polygon`
- Primitive attributes
    - `fill`
    - `stroke`
    - `x`, `y`
    - `w`, `h`
    - `text` (within boundaries)
    - `label` (outside boundaries)
- Attribute links (remembering object conections)
- Interactive primitives
    - `drag`
    - `resize`
- Axes
    - `zoom`
    - `pan`
    - Axes labels
    - Axes ticks
- Data bindings
- Basic plots
- Manual graph editing
- Graph layouts
- Guidelines and snapping
- File I/O
- Embedding
- Exporting
- Dynamic bindings (messaging layer)
