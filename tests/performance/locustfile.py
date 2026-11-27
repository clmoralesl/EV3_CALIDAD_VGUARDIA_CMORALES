"""Pruebas de rendimiento de la API CuidartePlus con Locust (issue #7).

Simula médicos que inician sesión y navegan por los listados y fichas.
Ejecución en CI (etapa 6):
    locust -f tests/performance/locustfile.py --headless -u 20 -r 5 -t 1m \
        --host http://localhost:4444 --csv resultados --html reporte.html

Los nombres de cada petición ("name") son las claves de umbrales.json.
"""

import os
import random

from locust import HttpUser, between, task

# Usuario de PRUEBA cargado por el dump de la BD de CI (no es una credencial real).
USUARIO = os.getenv("PERF_USER", "medico")
CLAVE = os.getenv("PERF_PASSWORD", "Clinica*C3ntr0")


def dv(cuerpo: int) -> str:
    """Dígito verificador del RUT chileno (módulo 11)."""
    suma, mult = 0, 2
    for d in reversed(str(cuerpo)):
        suma += int(d) * mult
        mult = 2 if mult == 7 else mult + 1
    r = 11 - (suma % 11)
    return "0" if r == 11 else "K" if r == 10 else str(r)


class Medico(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        with self.client.post(
            "/autenticacion/login",
            json={"nombre_usuario": USUARIO, "password": CLAVE},
            name="POST /autenticacion/login",
            catch_response=True,
        ) as res:
            if res.status_code != 200 or "token" not in res.json():
                res.failure(f"login falló: {res.status_code}")
                self.stop()
                return
            self.client.headers["Authorization"] = f"Bearer {res.json()['token']}"

    # Listados: tienen delayMiddleware(5000) INTENCIONAL en la API.
    @task(3)
    def listar_pacientes(self):
        self.client.get("/pacientes", name="GET /pacientes")

    @task(3)
    def listar_examenes(self):
        self.client.get("/examenes", name="GET /examenes")

    # Consultas simples (sin delay).
    @task(4)
    def tipos_examen(self):
        self.client.get("/tipo-examen", name="GET /tipo-examen")

    @task(4)
    def ficha_paciente(self):
        # Pacientes 1-8 vienen en el dump de prueba.
        self.client.get(f"/pacientes/{random.randint(1, 8)}", name="GET /pacientes/:id")

    # CP-31 (SquashTM): creación de paciente < 300 ms.
    @task(1)
    def crear_paciente(self):
        cuerpo = random.randint(40_000_000, 49_999_999)  # fuera del rango del dump y de las pruebas de API
        rut = f"{cuerpo}-{dv(cuerpo)}"
        self.client.post(
            "/pacientes",
            json={
                "rut": rut,
                "primer_nombre": "Carga",
                "apellido_paterno": "Locust",
                "fecha_nacimiento": "1985-03-15",
                "sexo": "M",
                "email": f"locust.{cuerpo}@prueba.test",
            },
            name="POST /pacientes [CP-31]",
        )
