"""Evalúa los resultados de Locust contra los umbrales (issue #7).

Uso: python check_umbrales.py resultados_stats.csv umbrales.json [resumen.md]
Falla (exit 1) si alguna petición supera su p95 máximo, si la tasa de error
global supera el máximo o si falta una petición esperada en los resultados.
"""

import csv
import json
import sys


def main() -> int:
    ruta_csv, ruta_umbrales = sys.argv[1], sys.argv[2]
    ruta_resumen = sys.argv[3] if len(sys.argv) > 3 else None

    umbrales = json.load(open(ruta_umbrales, encoding="utf-8"))
    filas = {f["Name"]: f for f in csv.DictReader(open(ruta_csv, encoding="utf-8"))}

    lineas = [
        "### Etapa 6 - Rendimiento (Locust)",
        "| Petición | Peticiones | Fallos | p50 (ms) | p95 (ms) | p95 máx. (ms) | Resultado |",
        "|---|---|---|---|---|---|---|",
    ]
    fallo = False

    for nombre, regla in umbrales["peticiones"].items():
        fila = filas.get(nombre)
        if fila is None or int(fila["Request Count"]) == 0:
            lineas.append(f"| {nombre} | 0 | - | - | - | {regla['p95_max_ms']} | ❌ sin peticiones |")
            print(f"::error::No hay resultados para '{nombre}'")
            fallo = True
            continue
        p95 = float(fila["95%"])
        ok = p95 <= regla["p95_max_ms"]
        fallo |= not ok
        if not ok:
            print(f"::error::{nombre}: p95 {p95:.0f} ms supera el máximo de {regla['p95_max_ms']} ms")
        lineas.append(
            f"| {nombre} | {fila['Request Count']} | {fila['Failure Count']} | {float(fila['50%']):.0f} "
            f"| {p95:.0f} | {regla['p95_max_ms']} | {'✅' if ok else '❌'} |"
        )

    total = filas.get("Aggregated")
    if total is None:
        print("::error::No se encontró la fila 'Aggregated' en los resultados")
        return 1
    peticiones, fallos = int(total["Request Count"]), int(total["Failure Count"])
    tasa = 100 * fallos / peticiones if peticiones else 100.0
    tasa_max = umbrales["tasa_error_max_pct"]
    ok_tasa = tasa <= tasa_max
    fallo |= not ok_tasa
    if not ok_tasa:
        print(f"::error::Tasa de error {tasa:.2f} % supera el máximo de {tasa_max} %")
    lineas += [
        "",
        f"**Total:** {peticiones} peticiones · {fallos} fallos · tasa de error **{tasa:.2f} %** "
        f"(máx. {tasa_max} %) {'✅' if ok_tasa else '❌'} · {float(total['Requests/s']):.1f} req/s",
        "",
        "Umbrales y su justificación en `tests/performance/umbrales.json`. Reporte HTML en el artefacto **reporte-locust**.",
    ]

    texto = "\n".join(lineas)
    print(texto)
    if ruta_resumen:
        with open(ruta_resumen, "a", encoding="utf-8") as f:
            f.write(texto + "\n")
    return 1 if fallo else 0


if __name__ == "__main__":
    sys.exit(main())
