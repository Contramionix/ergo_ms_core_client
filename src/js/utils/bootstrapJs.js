/**
 * Ленивая загрузка Bootstrap JS (Dropdown и др.) — не в entry bundle.
 */

let bootstrapPromise = null

export async function loadBootstrapJs() {
  if (!bootstrapPromise) {
    bootstrapPromise = import('bootstrap/dist/js/bootstrap.esm.min.js')
  }
  return bootstrapPromise
}

export async function getDropdownApi() {
  const bootstrap = await loadBootstrapJs()
  return bootstrap.Dropdown
}
