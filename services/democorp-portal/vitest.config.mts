import path from "node:path";

import { defineConfig } from "vitest/config";

const rootDir = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(rootDir, "node_modules/server-only/empty.js"),
      "@": path.resolve(rootDir, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
