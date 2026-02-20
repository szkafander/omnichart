import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildFromSource } from "./pipeline/build.js";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    return { command: "help" };
  }

  if (command !== "build") {
    throw new Error(`Unknown command "${command}". Try "omnichart help".`);
  }

  const input = rest[0];
  if (!input) {
    throw new Error("Missing input file. Usage: omnichart build <input.oc> -o <output.html>");
  }

  let output = "./out/chart.html";
  for (let i = 1; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === "-o" || token === "--output") {
      output = rest[i + 1];
      i += 1;
    }
  }

  return {
    command: "build",
    input,
    output
  };
}

export async function runCli(argv) {
  const args = parseArgs(argv);

  if (args.command === "help") {
    printHelp();
    return;
  }

  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);

  const source = await readFile(inputPath, "utf8");
  const html = await buildFromSource(source, { sourcePath: inputPath });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");

  console.log(`[omnichart] wrote ${outputPath}`);
}

function printHelp() {
  console.log(`omnichart

Usage:
  omnichart build <input.oc> -o <output.html>

Examples:
  omnichart build ./examples/scatter.oc -o ./out/scatter.html
`);
}


