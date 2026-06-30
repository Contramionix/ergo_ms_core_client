// Единая фабрика опций ApexCharts из токенов тем ядра.
// CSS-переменные резолвятся в конкретные цвета (ApexCharts рисует SVG-атрибутами,
// var() в них ненадёжен) и пересобираются при смене data-bs-theme.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { THEME_CHANGE_EVENT } from '@/js/theme-manager.js'

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function isDark() {
  return typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-bs-theme') === 'dark'
}

function deepMerge(base, over) {
  const out = Array.isArray(base) ? [...base] : { ...base }
  for (const k of Object.keys(over || {})) {
    const bv = out[k]
    const ov = over[k]
    out[k] = bv && ov && typeof bv === 'object' && typeof ov === 'object' && !Array.isArray(ov)
      ? deepMerge(bv, ov)
      : ov
  }
  return out
}

export function buildApexOptions(overrides = {}) {
  const text = cssVar('--color-primary-text', '#101223')
  const muted = cssVar('--color-secondary-text', '#6e6e6e')
  const border = cssVar('--color-border', '#e0e0e0')
  const accent = cssVar('--color-accent', '#d0322d')
  const base = {
    chart: {
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit',
      animations: { easing: 'easeinout', speed: 400 },
    },
    colors: [accent, '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
    grid: { borderColor: border, strokeDashArray: 4 },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      labels: { style: { colors: muted } },
      axisBorder: { color: border },
      axisTicks: { color: border },
    },
    yaxis: { labels: { style: { colors: muted } } },
    legend: { labels: { colors: text } },
    tooltip: { theme: isDark() ? 'dark' : 'light' },
    theme: { mode: isDark() ? 'dark' : 'light' },
  }
  return deepMerge(base, overrides)
}

export function useApexTheme(overrides = {}) {
  const options = ref(buildApexOptions(overrides))
  let observer = null
  const rebuild = () => { options.value = buildApexOptions(overrides) }

  onMounted(() => {
    window.addEventListener(THEME_CHANGE_EVENT, rebuild)

    if (typeof MutationObserver === 'undefined') return
    observer = new MutationObserver(rebuild)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] })

    const styleEl = document.getElementById('custom-theme-styles')
    if (styleEl) {
      observer.observe(styleEl, { childList: true, characterData: true, subtree: true })
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener(THEME_CHANGE_EVENT, rebuild)
    observer?.disconnect()
  })

  return { options, rebuild }
}
