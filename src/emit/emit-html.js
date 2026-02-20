import { browserRuntimeSource } from "../runtime/browser-runtime.js";

export function emitHtmlDocument(scene) {
  const title = escapeHtml(scene.meta.title);
  const sceneJson = JSON.stringify(scene);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #111; }
    #ocanvas { display: block; width: 100vw; height: 100vh; background: #181818; }
  </style>
</head>
<body>
  <canvas id="ocanvas" aria-label="${title}"></canvas>
  <script>
    ${browserRuntimeSource}
    window.OMNICHART_RUNTIME.render(document.getElementById("ocanvas"), ${sceneJson});
  </script>
</body>
</html>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}


