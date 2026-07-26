/** Color contrast helpers for theme editor. */

function parseCssColorToRgb(value) {
  const raw = String(value || '').trim()
  if (!raw) {
    return null
  }
  if (raw.startsWith('#')) {
    let hex = raw.slice(1)
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('')
    }
    if (hex.length !== 6) {
      return null
    }
    const n = Number.parseInt(hex, 16)
    if (Number.isNaN(n)) {
      return null
    }
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const rgba = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!rgba) {
    return null
  }
  return {
    r: Number.parseInt(rgba[1], 10),
    g: Number.parseInt(rgba[2], 10),
    b: Number.parseInt(rgba[3], 10),
  }
}

function relativeLuminance({ r, g, b }) {
  const toLinear = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function contrastRatio(fg, bg) {
  const a = parseCssColorToRgb(fg)
  const b = parseCssColorToRgb(bg)
  if (!a || !b) {
    return null
  }
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function isColorLikeToken(value) {
  const v = String(value || '').trim()
  if (!v) {
    return false
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) {
    return true
  }
  return /^rgba?\(/i.test(v)
}

