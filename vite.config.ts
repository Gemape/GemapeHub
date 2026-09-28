// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Na Vercel (variável VERCEL=1 durante o build) gera a saída no formato da Vercel;
  // fora dela mantém o servidor Node usado na VPN (npm start).
  nitro: { preset: process.env["VERCEL"] ? "vercel" : "node-server" },
  vite: { server: { host: "127.0.0.1", strictPort: true }, preview: { host: "127.0.0.1" } },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
