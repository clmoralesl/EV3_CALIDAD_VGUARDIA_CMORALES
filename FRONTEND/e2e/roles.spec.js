import { test, expect } from '@playwright/test'
import { iniciarSesion } from './helpers'

test.describe('Control de acceso por rol', () => {
  test('E2E-04 el paciente no ve las opciones de administración', async ({ page }) => {
    await iniciarSesion(page, 'paciente')

    await expect(page.getByRole('link', { name: 'Ir a Mis Resultados' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir a Usuarios' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ir a Auditoría' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ir a Pacientes' })).toHaveCount(0)
  })

  test('E2E-05 el paciente no puede abrir Usuarios escribiendo la URL', async ({ page }) => {
    await iniciarSesion(page, 'paciente')
    await page.goto('/usuarios')
    await expect(page.getByText('No autorizado (solo administrador).')).toBeVisible()
  })

  test('E2E-06 el administrador ve Usuarios y Auditoría', async ({ page }) => {
    await iniciarSesion(page, 'admin')
    await expect(page.getByRole('link', { name: 'Ir a Usuarios' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir a Auditoría' })).toBeVisible()
  })
})
