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

1. Define a chart/graphic in the mini-language (`.oc` file).
2. Run the CLI to compile it into a standalone `.html` file.
3. Open the output in any modern browser.

## Goals

- Render up to tens of thousands of primitives efficiently.
- Keep the mini-language intuitive and low-verbosity.
- Minimize dependencies and keep code readable.
- Avoid all installable software and apps.
- Minimize all initial setup.
- Enable visualization for:
    - Scientific data
    - Graphs and flowcharts
    - Dynamic, interactive charts
    - Text and tables
    - And all combinations of these

In other words: be Plotly, d3, yEd, mermaid, matplotlib and visual aspects of HTML/CSS at the same time, all with minimal to no dependencies and setup.

## The self-hosted artifact

`omnichart` generates a static HTML from an .oc file. The HTML file is simultaneously:
- Your (interactive) visualization.
- The entire `omnichart` runtime and compiler.

You can drop other .oc files on your compiled HTML, which will return a HTML generated from your .oc file as a download. That HTML can similarly generate more `omnichart` visualizations as HTML from more .oc files, etc.

Therefore, currently we have two workflows:
- CLI using `node`.
- Drop .oc file onto any `omnichart` HTML.

The only thing you need to infinitely proliferate `omnichart` charts is any `omnichart` chart. Note that this freezes the `omnichart` version. If you want to update, you need to pull the new runtime, or any chart generated with the new runtime.

Other workflows (i.e., locally hosted runtime, third party-hosted runtime) are coming.

## Quick start

```bash
node ./bin/omnichart.js build ./examples/scatter.oc -o ./out/scatter.html
open ./out/scatter.html
```

# Current status

Basic primitives can be rendered. Basic interactivity is in place.

## Coming next

- HTML drag&drop generator (the actual SHA pattern)
- High-level components
    - Graph
    - Table
    - Various plots
