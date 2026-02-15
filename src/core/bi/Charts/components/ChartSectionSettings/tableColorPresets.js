export const TWO_COLOR_PRESETS = [
  { id: 'red', label: 'Красный (оттенки)', colors: ['#ffcdd2', '#b71c1c'] },
  { id: 'green', label: 'Зеленый (оттенки)', colors: ['#c8e6c9', '#1b5e20'] },
  { id: 'blue', label: 'Синий (оттенки)', colors: ['#bbdefb', '#0d47a1'] },
  { id: 'purple', label: 'Фиолетовый (оттенки)', colors: ['#e1bee7', '#4a148c'] },
  { id: 'yellow', label: 'Желтый (оттенки)', colors: ['#fff9c4', '#f57f17'] },
  { id: 'teal', label: 'Бирюзовый (оттенки)', colors: ['#b2dfdb', '#004d40'] },
  { id: 'gray', label: 'Серый (оттенки)', colors: ['#e0e0e0', '#212121'] },
  { id: 'golden', label: 'Голден', colors: ['#fff8e1', '#ff6f00'] },
  { id: 'oceanic', label: 'Океаник', colors: ['#e0f7fa', '#006064'] },
  { id: 'lilac-red', label: 'Сиреневый-Красный', colors: ['#ce93d8', '#d32f2f'] },
  { id: 'orange-yellow', label: 'Оранжевый-Желтый', colors: ['#ff9800', '#fbc02d'] },
  { id: 'red-blue', label: 'Красный-Синий', colors: ['#f44336', '#1976d2'] },
  { id: 'green-blue', label: 'Зеленый-Синий', colors: ['#4caf50', '#2196f3'] },
]

export const THREE_COLOR_PRESETS = [
  { id: 'red-yellow-green', label: 'Красный-Желтый-Зеленый', colors: ['#f44336', '#ffeb3b', '#4caf50'] },
  { id: 'blue-gray-red', label: 'Синий-Серый-Красный', colors: ['#2196f3', '#9e9e9e', '#f44336'] },
  { id: 'orange-lightblue-lime', label: 'Оранжевый-Голубой-Салатовый', colors: ['#ff9800', '#03a9f4', '#8bc34a'] },
  { id: 'red-orange-yellow', label: 'Красный-Оранжевый-Желтый', colors: ['#f44336', '#ff9800', '#ffeb3b'] },
  { id: 'blue-cyan-green', label: 'Синий-Бирюзовый-Зеленый', colors: ['#2196f3', '#00bcd4', '#4caf50'] },
  { id: 'purple-pink-red', label: 'Фиолетовый-Розовый-Красный', colors: ['#9c27b0', '#e91e63', '#f44336'] },
]

export function getPresetById(type, id) {
  const list = type === 'three' ? THREE_COLOR_PRESETS : TWO_COLOR_PRESETS
  return list.find((p) => p.id === id) || list[0]
}

export function getGradientCss(colors, reverse = false) {
  const c = reverse ? [...colors].reverse() : colors
  const stops = c.map((color, i) => `${color} ${(i / (c.length - 1)) * 100}%`).join(', ')
  return `linear-gradient(to right, ${stops})`
}

function parseHex(hex) {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function lerpHex(c1, c2, t) {
  const a = parseHex(c1)
  const b = parseHex(c2)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r},${g},${bl})`
}

function interpolateColor(colors, t) {
  if (!colors?.length) return 'transparent'
  if (colors.length === 1) return colors[0]
  const clamped = Math.max(0, Math.min(1, t))
  if (colors.length === 2) return lerpHex(colors[0], colors[1], clamped)
  if (clamped <= 0.5) return lerpHex(colors[0], colors[1], clamped * 2)
  return lerpHex(colors[1], colors[2], (clamped - 0.5) * 2)
}

export function getColorForValue(value, options, dataMin, dataMax) {
  const colors = options?.colors ?? []
  const reverse = options?.reverseGradient === true
  const useThresholds = options?.useThresholds === true
  const thresholds = options?.thresholds ?? []
  const emptyAsZero = options?.emptyAsZero === true
  const raw = Number(value)
  if (value == null || value === '' || !Number.isFinite(raw)) {
    return emptyAsZero ? interpolateColor(colors, 0) : null
  }
  const type = options?.gradientType === 'three' ? 'three' : 'two'
  const list = type === 'three' ? THREE_COLOR_PRESETS : TWO_COLOR_PRESETS
  const preset = list.find((p) => p.id === (options?.gradientPreset ?? 'blue')) || list[0]
  const baseColors = preset.colors ?? []
  const c = reverse ? [...baseColors].reverse() : baseColors
  let t
  if (useThresholds && thresholds.length) {
    if (type === 'two' && thresholds[0] != null) {
      t = raw <= thresholds[0] ? 0 : 1
    } else if (type === 'three' && thresholds[0] != null && thresholds[1] != null) {
      const [T1, T2] = thresholds
      if (raw <= T1) t = 0
      else if (raw >= T2) t = 1
      else t = (raw - T1) / (T2 - T1)
    } else {
      const min = dataMin ?? 0
      const max = dataMax ?? 1
      t = max > min ? (raw - min) / (max - min) : 0
    }
  } else {
    const min = dataMin ?? 0
    const max = dataMax ?? 1
    t = max > min ? (raw - min) / (max - min) : 0
  }
  return interpolateColor(c, t)
}
