import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Build a standalone Node server (Docker/Coolify) instead of the Cloudflare
  // Workers default. Output: .output/server/index.mjs — run with
  // `node .output/server/index.mjs` (PORT, default 3000).
  nitro: { preset: "node-server" },
});
