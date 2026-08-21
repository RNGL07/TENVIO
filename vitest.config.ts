import { defineConfig } from "vitest/config";

// Deliberately minimal — only the pure lib functions under src/lib have
// tests right now (see src/lib/loyalty.test.ts), so no path aliases,
// React plugin, or DOM environment are needed. Add them here if/when a
// component or Prisma-mocked integration test is added.
export default defineConfig({
  test: {
    environment: "node",
  },
});
