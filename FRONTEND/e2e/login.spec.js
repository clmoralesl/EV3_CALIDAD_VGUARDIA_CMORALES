import { test, expect } from '@playwright/test'
import { iniciarSesion } from './helpers'

test.describe('Inicio de sesión', () => {
  test('E2E-01 login válido lleva al inicio', async ({ page }) => {
    await iniciarSesion(page, 'admin')
    await expect(page.getByRole('link', { name: 'Ir a Usuarios' })).toBeVisible()
  })

  test('E2E-02 login con contraseña incorrecta muestra error y no entra', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('input-nombre-usuario').fill('admin')
    await page.getByTestId('input-password').fill('ContrasenaIncorrecta123')
    await page.getByTestId('button-login').click()

    // Nota: la app muestra este toast dos veces (interceptor de axios + pantalla de login)
    await expect(page.getByText('Credenciales inválidas').first()).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('E2E-03 una ruta protegida sin sesión redirige al login', async ({ page }) => {
    await page.goto('/pacientes')
    await expect(page).toHaveURL(/\/login$/)
  })
})
