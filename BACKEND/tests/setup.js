// Cierra la conexión a PostgreSQL al terminar cada archivo de pruebas,
// para que Vitest no quede esperando conexiones abiertas.
// Se usa require (createRequire) para obtener la MISMA instancia de pool que usa la app.
import { afterAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { pool } = require("../src/db");

afterAll(async () => {
  await pool.end();
});
