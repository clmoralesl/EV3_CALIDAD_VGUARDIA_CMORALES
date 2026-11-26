// Pruebas de gestión de pacientes (trazables a SquashTM).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { api, token, bearer, dv, pacienteNuevo, pool } = require("./helpers");

const creados = [];
let tokenMedico;
let tokenPaciente;

beforeAll(async () => {
  tokenMedico = await token("medico");
  tokenPaciente = await token("paciente");
});

// Limpia los pacientes creados por estas pruebas.
afterAll(async () => {
  if (creados.length) await pool.query("DELETE FROM pacientes WHERE id = ANY($1::bigint[])", [creados]);
});

async function crear(datos, t = tokenMedico) {
  const res = await api().post("/pacientes").set(bearer(t)).send(datos);
  if (res.status === 201) creados.push(Number(res.body.id));
  return res;
}

describe("Registro de pacientes (RF-2.2)", () => {
  it("CP-06 el médico registra un paciente con RUT válido (201)", async () => {
    const datos = pacienteNuevo({ rut: undefined });
    const cuerpo = 30000000 + Math.floor(Math.random() * 10000000);
    datos.rut = `${String(cuerpo).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv(cuerpo)}`; // con puntos
    const res = await crear(datos);
    expect(res.status).toBe(201);
    expect(Number(res.body.id)).toBeGreaterThan(0);
    expect(res.body.rut).toBe(`${cuerpo}-${dv(cuerpo)}`); // la API normaliza quitando puntos
  });

  it("CP-07 un RUT con formato inválido se rechaza con 400", async () => {
    const res = await crear(pacienteNuevo({ rut: "12ABC678" }));
    expect(res.status).toBe(400);
  });

  // Defecto conocido: la API valida solo el formato del RUT, no el dígito verificador.
  it.fails("CP-07 un RUT con dígito verificador erróneo se rechaza con 400 [defecto conocido: la API no valida el DV]", async () => {
    const datos = pacienteNuevo();
    const [cuerpo, digito] = datos.rut.split("-");
    datos.rut = `${cuerpo}-${digito === "1" ? "2" : "1"}`;
    const res = await crear(datos);
    expect(res.status).toBe(400);
  });

  it("CP-10 un RUT duplicado se rechaza con 400", async () => {
    const datos = pacienteNuevo();
    expect((await crear(datos)).status).toBe(201);
    const res = await crear({ ...datos, email: `dup.${datos.email}` });
    expect(res.status).toBe(400);
    expect(res.body.glosa).toMatch(/RUT o email ya existe/);
  });

  it("CP-14 faltan campos obligatorios (sin nombre ni email) se rechaza con 400", async () => {
    const { rut, fecha_nacimiento, sexo } = pacienteNuevo();
    const res = await crear({ rut, fecha_nacimiento, sexo });
    expect(res.status).toBe(400);
  });

  // Mismo defecto que E2E-07b: el formulario envía estado_civil y grupo_sanguineo vacíos y la API los rechaza.
  it.fails("CP-06 registrar con estado civil y grupo sanguíneo vacíos (opcionales) responde 201 [defecto conocido: la API rechaza '']", async () => {
    const res = await crear(pacienteNuevo({ estado_civil: "", grupo_sanguineo: "" }));
    expect(res.status).toBe(201);
  });

  it("CP-17 un paciente no puede registrar pacientes (403)", async () => {
    const res = await crear(pacienteNuevo(), tokenPaciente);
    expect(res.status).toBe(403);
  });
});

describe("Consulta de pacientes (RF-2.3 / NFR-SEG-8)", () => {
  it("CP-08 el médico obtiene un paciente por id (200)", async () => {
    const creado = await crear(pacienteNuevo());
    const res = await api().get(`/pacientes/${creado.body.id}`).set(bearer(tokenMedico));
    expect(res.status).toBe(200);
    expect(res.body.rut).toBe(creado.body.rut);
  });

  it("CP-08 un paciente inexistente responde 404", async () => {
    const res = await api().get("/pacientes/999999").set(bearer(tokenMedico));
    expect(res.status).toBe(404);
  });

  // Defecto conocido: /pacientes/buscar/rut/:rut no exige token y expone datos personales y de salud.
  it.fails("CP-30 buscar un paciente por RUT sin token responde 401 [defecto conocido: endpoint sin autenticación]", async () => {
    const creado = await crear(pacienteNuevo());
    const res = await api().get(`/pacientes/buscar/rut/${creado.body.rut}`);
    expect(res.status).toBe(401);
  });
});
