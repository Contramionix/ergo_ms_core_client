/**
 * Парсинг CLIENT_MODULE_REMOTES: name=url,name2=url2
 * @param {string} [raw]
 * @returns {{ name: string, entry: string }[]}
 */
export function parseModuleRemotes(raw = '') {
  const items = []
  for (const part of String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)) {
    const eq = part.indexOf('=')
    if (eq <= 0) continue
    const name = part.slice(0, eq).trim()
    const entry = part.slice(eq + 1).trim()
    if (name && entry) {
      items.push({ name, entry })
    }
  }
  return items
}
