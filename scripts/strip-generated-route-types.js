import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";

const tsRouteTreePath = resolve(process.cwd(), "src/routeTree.gen.ts");
const oldJsRouteTreePath = resolve(process.cwd(), "src/routeTree.gen.js");
const jsRouteTreePath = resolve(process.cwd(), ".tanstack/routeTree.gen.js");

function stripGeneratedRouteTypes() {
  if (existsSync(tsRouteTreePath)) {
    rmSync(tsRouteTreePath, { force: true });
  }

  if (existsSync(oldJsRouteTreePath)) {
    rmSync(oldJsRouteTreePath, { force: true });
  }

  if (existsSync(jsRouteTreePath)) {
    rmSync(jsRouteTreePath, { force: true });
  }

  if (!existsSync(jsRouteTreePath)) return;

  const code = readFileSync(jsRouteTreePath, "utf8");
  const footerStart = code.indexOf("\nimport type");
  const stripped = footerStart >= 0 ? code.slice(0, footerStart) : code;

  if (stripped !== code) {
    writeFileSync(jsRouteTreePath, stripped);
  }
}

for (let attempt = 0; attempt < 12; attempt += 1) {
  stripGeneratedRouteTypes();
  await setTimeout(500);
}
