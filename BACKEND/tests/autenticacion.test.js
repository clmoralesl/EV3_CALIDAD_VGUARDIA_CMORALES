// Pruebas de autenticación y control de acceso (trazables a SquashTM).
import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const { api, token, bearer, pacienteNuevo, pool, USUARIOS } = require("./helpers");

describe("Autenticación (RF-1.1 / NFR-SEG-9)", () => {
  it.each(["paciente", "medico", "admin"])("CP-01 login válido como %s entrega un JWT con su rol", async (rol) => {
    const res = await api().post("/autenticacion/login").send(USUARIOS[rol]);
    expect(res.status).toBe(200);
    const datos = jwt.decode(res.body.token);
    expect(datos.nombreUsuario).toBe(USUARIOS[rol].nombre_usuario);
    expect(datos.roles.map((r) => r.nombre)).toContain(rol);
  });

  it("CP-02 login con contraseña errónea responde 401 'Credenciales inválidas'", async () => {
    const res = await api()
      .post("/autenticacion/login")
      .send({ nombre_usuario: USUARIOS.paciente.nombre_usuario, password: "ClaveErronea2026!" });
    expect(res.status).toBe(200); // FALLO CONTROLADO (#13): expectativa incorrecta, NO MERGEAR
    expect(res.body.error).toBe("Credenciales inválidas");
    expect(res.body.token).toBeUndefined();
  });

  it("CP-02 login con usuario inexistente responde 401 sin revelar si el usuario existe", async () => {
    const res = await api().post("/autenticacion/login").send({ nombre_usuario: "no_existe_api", password: "ClaveErronea2026!" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Credenciales inválidas");
  });

  // Defecto conocido: las contraseñas se guardan y comparan en texto plano (routes/auth.js).
  // it.fails documenta el defecto: pasa mientras exista y avisará cuando se corrija.
  it.fails("CP-03 la contraseña se almacena con hash bcrypt [defecto conocido: texto plano]", async () => {
    const { rows } = await pool.query("SELECT contrasena FROM usuarios WHERE nombre_usuario = $1", [USUARIOS.paciente.nombre_usuario]);
    expect(rows[0].contrasena).toMatch(/^\$2[aby]\$\d{2}\$/);
  });
});

describe("Acceso sin autenticación o con token inválido (CP-05 / CP-29)", () => {
  let tokenPaciente;
  beforeAll(async () => {
    tokenPaciente = await token("paciente");
  });

  it.each([
    ["GET", "/pacientes/1"],
    ["GET", "/examenes/1"],
    ["POST", "/pacientes"],
    ["GET", "/auditoria"],
  ])("CP-05 %s %s sin token responde 401", async (metodo, ruta) => {
    // Se envía un cuerpo válido: la API valida el cuerpo antes de revisar el token.
    const peticion = api()[metodo.toLowerCase()](ruta);
    const res = metodo === "POST" ? await peticion.send(pacienteNuevo()) : await peticion;
    expect(res.status).toBe(401);
  });

  it("CP-29 un token con la firma manipulada se rechaza con 401", async () => {
    const [cabecera, carga] = tokenPaciente.split(".");
    const manipulado = `${cabecera}.${carga}.firmaFalsa`;
    const res = await api().get("/examenes/1").set(bearer(manipulado));
    expect(res.status).toBe(401);
  });

  it("CP-29 un token firmado con otra clave se rechaza con 401", async () => {
    const falso = jwt.sign({ usuarioId: 1, rolNombre: "admin" }, "otra-clave-no-valida");
    const res = await api().get("/examenes/1").set(bearer(falso));
    expect(res.status).toBe(401);
  });
});
