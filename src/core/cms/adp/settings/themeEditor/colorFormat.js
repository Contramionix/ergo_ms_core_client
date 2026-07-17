/**
 * Единый формат цветов в редакторе тем: hex.
 * Непрозрачные — #rrggbb, с alpha < 1 — #rrggbbaa.
 */

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(Number(n) || 0)))
}

function toHexByte(n) {
  return clampByte(n).toString(16).padStart(2, '0')
}

/**
 * @returns {{ r: number, g: number, b: number, a: number } | null}
 */
export function parseCssColor(value) {
  const raw = String(value || '').trim()
  if (!raw) {
    return null
  }

  if (raw.startsWith('#')) {
    let hex = raw.slice(1)
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('')
    }
    if (hex.length === 4) {
      hex = hex.split('').map((c) => c + c).join('')
    }
    if (hex.length !== 6 && hex.length !== 8) {
      return null
    }
    const n = Number.parseInt(hex.slice(0, 6), 16)
    if (Number.isNaN(n)) {
      return null
    }
    const a = hex.length === 8
      ? clampByte(Number.parseInt(hex.slice(6, 8), 16)) / 255
      : 1
    if (hex.length === 8 && Number.isNaN(Number.parseInt(hex.slice(6, 8), 16))) {
      return null
    }
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
      a,
    }
  }

  const rgba = raw.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+%?))?\s*\)$/i,
  )
  if (!rgba) {
    return null
  }

  let a = 1
  if (rgba[4] != null) {
    const alphaRaw = rgba[4]
    a = alphaRaw.endsWith('%')
      ? Number.parseFloat(alphaRaw) / 100
      : Number.parseFloat(alphaRaw)
    if (Number.isNaN(a)) {
      a = 1
    }
    a = Math.max(0, Math.min(1, a))
  }

  return {
    r: clampByte(rgba[1]),
    g: clampByte(rgba[2]),
    b: clampByte(rgba[3]),
    a,
  }
}

/**
 * @param {{ r: number, g: number, b: number, a?: number }} color
 * @returns {string}
 */
export function formatColorAsHex(color) {
  if (!color) {
    return '#000000'
  }
  const rgb = `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`
  const a = color.a == null ? 1 : color.a
  if (a >= 0.999) {
    return rgb
  }
  return `${rgb}${toHexByte(a * 255)}`
}

/** Нормализовать любое CSS-значение цвета к единому hex (или вернуть исходную строку, если не распознано). */
export function normalizeColorToHex(value) {
  const parsed = parseCssColor(value)
  if (!parsed) {
    return String(value || '').trim()
  }
  return formatColorAsHex(parsed)
}

/** Opaque #rrggbb для &lt;input type="color"&gt;. */
export function toOpaqueHexForNativeInput(value) {
  const parsed = parseCssColor(value)
  if (!parsed) {
    return '#000000'
  }
  return formatColorAsHex({ ...parsed, a: 1 })
}

/**
 * Сменить RGB, сохранив alpha исходного значения (для native picker / eyedropper).
 */
export function applyRgbKeepingAlpha(nextRgbValue, previousValue) {
  const next = parseCssColor(nextRgbValue)
  if (!next) {
    return normalizeColorToHex(nextRgbValue)
  }
  const prev = parseCssColor(previousValue)
  return formatColorAsHex({
    r: next.r,
    g: next.g,
    b: next.b,
    a: prev?.a ?? 1,
  })
}

/** Нормализовать словарь цветов темы к hex. */
export function normalizeColorMapToHex(colors) {
  if (!colors || typeof colors !== 'object') {
    return {}
  }
  const result = {}
  for (const [key, value] of Object.entries(colors)) {
    result[key] = normalizeColorToHex(value)
  }
  return result
}
