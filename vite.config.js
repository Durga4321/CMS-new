// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const routeTreePath = resolve(process.cwd(), ".tanstack/routeTree.gen.js");
const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET ??
  process.env.VITE_API_BASE_URL ??
  "https://irritant-kilobyte-until.ngrok-free.dev";

function sendProxyError(res, path, error) {
  if (!res || res.headersSent) return;

  res.writeHead(503, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      error: "API proxy unavailable",
      message: `Unable to reach ${apiProxyTarget}. Check VITE_API_PROXY_TARGET or restart the backend tunnel.`,
      path,
      detail: error.message,
    }),
  );
}

function stripRouteTreeTypeFooter(code) {
  const footerStart = code.indexOf("\nimport type");
  if (footerStart >= 0) {
    return code.slice(0, footerStart);
  }

  return code;
}

function stripRouteTreeTypeFooterOnDisk() {
  if (!existsSync(routeTreePath)) return;

  const code = readFileSync(routeTreePath, "utf8");
  const stripped = stripRouteTreeTypeFooter(code);
  if (stripped !== code) {
    writeFileSync(routeTreePath, stripped);
  }
}

function stripGeneratedRouteTreeTypes() {
  return {
    name: "strip-generated-route-tree-types",
    enforce: "pre",
    buildStart() {
      stripRouteTreeTypeFooterOnDisk();
    },
    closeBundle() {
      stripRouteTreeTypeFooterOnDisk();
    },
    transform(code, id) {
      if (
        !id.endsWith("/.tanstack/routeTree.gen.js") &&
        !id.endsWith("\\.tanstack\\routeTree.gen.js")
      ) {
        return null;
      }

      const stripped = stripRouteTreeTypeFooter(code);
      if (stripped !== code) {
        stripRouteTreeTypeFooterOnDisk();
      }

      return { code: stripped, map: null };
    },
  };
}
// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  vite: {
    plugins: [stripGeneratedRouteTreeTypes()],
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          timeout: 30000,
          proxyTimeout: 30000,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
          configure(proxy) {
            proxy.on("error", (error, req, res) => {
              const path = req?.url ?? "/api";
              console.warn(
                `[api proxy] ${path} failed: ${error.message}. Target: ${apiProxyTarget}`,
              );
              sendProxyError(res, path, error);
            });
          },
        },
      },
    },
  },
  tanstackStart: {
    router: {
      generatedRouteTree: "../.tanstack/routeTree.gen.js",
      disableTypes: true,
    },
    server: { entry: "server" },
  },
});
