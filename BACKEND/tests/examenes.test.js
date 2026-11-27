// Pruebas de consulta de exámenes médicos (trazables a SquashTM).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { api, token, bearer, pool, USUARIOS } = require("./helpers");

let tokenMedico;
let tokenPaciente;
let examenPropio; // examen del paciente de prueba
let examenAjeno; // examen de otro paciente
const creados = [];

// El dump no trae exámenes: se crean con la API (CP-11) y se borran al final.
async function crearExamen(pacienteId) {
  const res = await api()
    .post("/examenes")
    .set(bearer(tokenMedico))
    .send({ tipo_examen_medico_id: 1, paciente_id: pacienteId, diagnosis: "Prueba API", observaciones: "Creado por pruebas automáticas" });
  if (res.status === 201) creados.push(Number(res.body.id));
  return res;
}

beforeAll(async () => {
  tokenMedico = await token("medico");
  tokenPaciente = await token("paciente");

  // Paciente asociado al usuario de prueba y otro paciente cualquiera.
  const propio = await pool.query(
    "SELECT p.id FROM pacientes p JOIN usuarios u ON u.id = p.usuario_id WHERE u.nombre_usuario = $1",
    [USUARIOS.paciente.nombre_usuario]
  );
  const ajeno = await pool.query("SELECT id FROM pacientes WHERE id <> $1 ORDER BY id LIMIT 1", [propio.rows[0].id]);

  const [rPropio, rAjeno] = await Promise.all([crearExamen(Number(propio.rows[0].id)), crearExamen(Number(ajeno.rows[0].id))]);
  if (rPropio.status !== 201 || rAjeno.status !== 201) {
    throw new Error(`No se pudieron crear exámenes de prueba: ${rPropio.status} / ${rAjeno.status}`);
  }
  examenPropio = Number(rPropio.body.id);
  examenAjeno = Number(rAjeno.body.id);
});

afterAll(async () => {
  if (creados.length) await pool.query("DELETE FROM examen_medico WHERE id = ANY($1::bigint[])", [creados]);
});

describe("Registro de exámenes (RF-3.1)", () => {
  it("CP-11 el médico registra un examen asociado a un paciente existente (201)", () => {
    // Los exámenes se crearon en beforeAll; aquí se verifica el resultado.
    expect(examenPropio).toBeGreaterThan(0);
    expect(examenAjeno).toBeGreaterThan(0);
  });

  it("CP-14 un examen sin tipo ni paciente se rechaza con 400", async () => {
    const res = await api().post("/examenes").set(bearer(tokenMedico)).send({ diagnosis: "Incompleto" });
    expect(res.status).toBe(400);
  });

  it("CP-17 un paciente no puede registrar exámenes (403)", async () => {
    const res = await api().post("/examenes").set(bearer(tokenPaciente)).send({ tipo_examen_medico_id: 1, paciente_id: 1 });
    expect(res.status).toBe(403);
  });
});

describe("Obtener examen por id (RF-3.1 / RF-4.1)", () => {
  it("CP-12 el médico obtiene un examen por id con su tipo y paciente (200)", async () => {
    const res = await api().get(`/examenes/${examenAjeno}`).set(bearer(tokenMedico));
    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(examenAjeno);
    expect(res.body).toHaveProperty("tipo_examen_nombre");
    expect(res.body).toHaveProperty("paciente_rut");
  });

  it("CP-16 el paciente obtiene su propio examen (200)", async () => {
    const res = await api().get(`/examenes/${examenPropio}`).set(bearer(tokenPaciente));
    expect(res.status).toBe(200);
    expect(Number(res.body.id)).toBe(examenPropio);
  });

  it("CP-17 el paciente no puede ver el examen de otro paciente (403/404)", async () => {
    const res = await api().get(`/examenes/${examenAjeno}`).set(bearer(tokenPaciente));
    expect([403, 404]).toContain(res.status);
    expect(res.body).not.toHaveProperty("paciente_rut");
  });

  it("CP-12 un examen inexistente responde 404", async () => {
    const res = await api().get("/examenes/999999").set(bearer(tokenMedico));
    expect(res.status).toBe(404);
  });
});
