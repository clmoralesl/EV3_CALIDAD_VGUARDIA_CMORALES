import { test, expect } from '@playwright/test'
import { iniciarSesion, elegirEnSelect } from './helpers'

// Paciente del dump vinculado al usuario "paciente" (Juan Pérez, RUT 11111111-1)
const PACIENTE_SEED = /11\.?111\.?111-1/

test.describe('Exámenes médicos', () => {
  test('E2E-09 el médico registra un examen y el paciente lo ve en Mis Resultados', async ({ browser }) => {
    // 1. El médico registra el examen
    const medico = await browser.newPage()
    await iniciarSesion(medico, 'medico')
    await medico.getByRole('link', { name: 'Ir a Exámenes Médicos' }).click()
    await medico.getByRole('tab', { name: 'Nuevo Examen' }).click()

    const tipoExamen = await elegirEnSelect(medico, 'tipo_examen_medico_id', 0)
    await elegirEnSelect(medico, 'paciente_id', PACIENTE_SEED)
    await medico.locator('textarea[name="diagnosis"]:not([aria-hidden])')
      .fill(`Diagnóstico E2E ${Date.now()}`)

    await medico.getByRole('button', { name: 'Crear Examen' }).click()
    await expect(medico.getByText('Examen creado exitosamente')).toBeVisible({ timeout: 20_000 })
    await medico.close()

    // 2. El paciente lo ve en Mis Resultados (sesión independiente)
    const contexto = await browser.newContext()
    const paciente = await contexto.newPage()
    await iniciarSesion(paciente, 'paciente')
    await paciente.getByRole('link', { name: 'Ir a Mis Resultados' }).click()

    await expect(paciente.getByText('Mis Resultados Médicos')).toBeVisible()
    await expect(paciente.getByText(tipoExamen).first()).toBeVisible({ timeout: 20_000 })
    await contexto.close()
  })
})
