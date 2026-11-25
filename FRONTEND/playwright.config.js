// Configuración de Playwright para las pruebas E2E de CuidartePlus (issue #5).
// Por defecto prueba el frontend levantado con Docker Compose (http://localhost:3333).
import { defineConfig, devices } from '@playwright/test'

const enCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  // GET /pacientes, GET /examenes y POST /examenes tienen un delay intencional de 5 s
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3333',
    locale: 'es-CL',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
})
