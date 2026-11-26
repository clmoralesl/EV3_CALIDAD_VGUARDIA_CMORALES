// Pruebas funcionales de la API (issue #4): Vitest + Supertest contra PostgreSQL real.
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    // Algunas rutas tienen delayMiddleware(5000) a propósito.
    testTimeout: 20000,
    hookTimeout: 30000,
    // Los archivos comparten la misma BD: se ejecutan de a uno.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      reporter: ["text-summary", "json-summary", "lcov", "html"],
      reportsDirectory: "coverage",
    },
  },
});
