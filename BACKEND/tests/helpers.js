// Utilidades compartidas por las pruebas de API.
const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/db");

// Usuarios de PRUEBA cargados por el dump de la BD (los mismos que usa la etapa E2E).
const USUARIOS = {
  admin: { nombre_usuario: process.env.API_ADMIN_USER || "admin", password: process.env.API_ADMIN_PASSWORD || "S1st3m@_S3gur0" },
  medico: { nombre_usuario: process.env.API_MEDICO_USER || "medico", password: process.env.API_MEDICO_PASSWORD || "Clinica*C3ntr0" },
  paciente: { nombre_usuario: process.env.API_PACIENTE_USER || "paciente", password: process.env.API_PACIENTE_PASSWORD || "Salud.Vital_26" },
};

const api = () => request(app);

async function token(rol) {
  const res = await api().post("/autenticacion/login").send(USUARIOS[rol]);
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión como ${rol}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

const bearer = (t) => ({ Authorization: `Bearer ${t}` });

// Dígito verificador chileno (módulo 11).
function dv(cuerpo) {
  let suma = 0;
  let mult = 2;
  for (const d of String(cuerpo).split("").reverse()) {
    suma += Number(d) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (suma % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
}

// RUT válido y único por ejecución (rango 30.000.000 - 39.999.999, fuera de los datos del dump).
function rutValido() {
  const cuerpo = 30000000 + Math.floor(Math.random() * 10000000);
  return `${cuerpo}-${dv(cuerpo)}`;
}

function pacienteNuevo(extra = {}) {
  const rut = rutValido();
  return {
    rut,
    primer_nombre: "Prueba",
    apellido_paterno: "Api",
    fecha_nacimiento: "1990-05-20",
    sexo: "F",
    email: `api.${rut.replace("-", "")}@prueba.test`,
    ...extra,
  };
}

module.exports = { api, token, bearer, dv, rutValido, pacienteNuevo, pool, USUARIOS };
