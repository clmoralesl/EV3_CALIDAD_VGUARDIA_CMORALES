const js = require("@eslint/js");
const globals = require("globals");
const security = require("eslint-plugin-security");

module.exports = [
  { ignores: ["node_modules", "uploads", "coverage", "reports"] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  // Pruebas de API (issue #4): Vitest exige sintaxis ESM en los archivos de prueba.
  {
    files: ["tests/**/*.test.js", "tests/setup.js"],
    languageOptions: { sourceType: "module" },
  },
  // En el código de pruebas (no en la app) se omiten los avisos de seguridad por acceso
  // dinámico a objetos y regex: son datos de prueba controlados.
  {
    files: ["tests/**/*.js"],
    rules: {
      "security/detect-object-injection": "off",
      "security/detect-unsafe-regex": "off",
    },
  },
];
