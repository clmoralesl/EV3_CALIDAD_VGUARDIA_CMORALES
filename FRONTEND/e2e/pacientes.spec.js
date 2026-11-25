import { test, expect } from '@playwright/test'
import { iniciarSesion, elegirEnSelect, rutValido } from './helpers'

async function abrirRegistroPaciente(page) {
  await iniciarSesion(page, 'medico')
  await page.getByRole('link', { name: 'Ir a Pacientes' }).click()
  await page.getByRole('tab', { name: 'Registrar Paciente' }).click()
}

async function llenarCamposObligatorios(page, rut) {
  await page.locator('input[name="rut"]').fill(rut)
  await page.locator('input[name="primer_nombre"]').fill('Prueba')
  await page.locator('input[name="apellido_paterno"]').fill('Automatizada')
  await page.locator('input[name="fecha_nacimiento"]').fill('1990-05-20')
  await elegirEnSelect(page, 'sexo', 'Femenino')
  await page.locator('input[name="email"]').fill(`e2e.${rut.replace('-', '')}@example.com`)
}

test.describe('Registro de pacientes', () => {
  test('E2E-07 el médico registra un paciente con RUT válido', async ({ page }) => {
    await abrirRegistroPaciente(page)
    await llenarCamposObligatorios(page, rutValido())
    // Ver E2E-07b: hoy el registro solo funciona si también se eligen estos dos campos
    await elegirEnSelect(page, 'estado_civil', 'Soltero')
    await elegirEnSelect(page, 'grupo_sanguineo', 'O+')

    await page.getByRole('button', { name: 'Registrar Paciente' }).click()
    await expect(page.getByText('Paciente registrado exitosamente')).toBeVisible()
  })

  // DEFECTO CONOCIDO: el formulario marca "Estado civil" y "Grupo sanguíneo" como opcionales,
  // pero la API responde 400 ("Estado civil inválido", "Grupo sanguíneo inválido") si van vacíos.
  // test.fail() documenta el defecto: la prueba "pasa" mientras el defecto exista y avisará
  // (fallará) cuando se corrija, para quitar esta marca.
  test('E2E-07b registrar un paciente solo con los campos obligatorios', async ({ page }) => {
    test.fail(true, 'Defecto: la API rechaza estado_civil y grupo_sanguineo vacíos')
    test.setTimeout(45_000)
    await abrirRegistroPaciente(page)
    await llenarCamposObligatorios(page, rutValido())

    await page.getByRole('button', { name: 'Registrar Paciente' }).click()
    await expect(page.getByText('Paciente registrado exitosamente')).toBeVisible({ timeout: 8_000 })
  })

  test('E2E-08 un RUT con formato inválido se rechaza en el formulario', async ({ page }) => {
    await abrirRegistroPaciente(page)

    const rut = page.locator('input[name="rut"]')
    await rut.fill('abc')
    await rut.blur()
    await expect(page.getByText('El RUT debe tener formato válido')).toBeVisible()
  })
})
