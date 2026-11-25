import { expect } from '@playwright/test'

// Credenciales de PRUEBA (usuarios del dump de la BD de CI).
// Se leen desde variables de entorno; el workflow etapa-4-e2e.yml las define.
function credencial(rol) {
  const prefijo = `E2E_${rol.toUpperCase()}`
  const usuario = process.env[`${prefijo}_USER`]
  const password = process.env[`${prefijo}_PASSWORD`]
  if (!usuario || !password) {
    throw new Error(`Faltan las variables ${prefijo}_USER y ${prefijo}_PASSWORD`)
  }
  return { usuario, password }
}

export async function iniciarSesion(page, rol) {
  const { usuario, password } = credencial(rol)
  await page.goto('/login')
  await page.getByTestId('input-nombre-usuario').fill(usuario)
  await page.getByTestId('input-password').fill(password)
  await page.getByTestId('button-login').click()
  await expect(page).toHaveURL(/\/home$/)
}

// Selecciona una opción en un <Select> de MUI a partir del atributo name de su input oculto
export async function elegirEnSelect(page, name, opcion) {
  await page.locator(`input[name="${name}"]`).locator('xpath=preceding-sibling::*[@role="combobox"]').click()
  const item = typeof opcion === 'number'
    ? page.getByRole('option').nth(opcion)
    : page.getByRole('option', { name: opcion, exact: typeof opcion === 'string' })
  const texto = (await item.innerText()).trim()
  await item.click()
  return texto
}

// Genera un RUT chileno válido (dígito verificador módulo 11), distinto en cada ejecución
export function rutValido() {
  const cuerpo = String(30_000_000 + Math.floor(Math.random() * 9_000_000))
  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo.charAt(i)) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return `${cuerpo}-${dv}`
}
