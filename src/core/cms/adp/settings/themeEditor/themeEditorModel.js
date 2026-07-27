/** Pure helpers for theme editor model / module pairs. */

import { getDefaultColors } from '@/js/theme-manager'
import { normalizeColorMapToHex } from './colorFormat.js'
import { tGlobal } from '@/i18n/index.js'

export function pickEditableFields(source) {
  return {
    name: source?.name || '',
    description: source?.description || '',
    author: source?.author || '',
    base_theme: source?.base_theme || 'light',
    colors: normalizeColorMapToHex(source?.colors || {}),
    bootstrap_colors: normalizeColorMapToHex(source?.bootstrap_colors || {}),
    module_tokens: { ...(source?.module_tokens || {}) },
  }
}

export function normalizedModulePairKey(value, fallback = 'default') {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function groupFlatThemesToPairs(flatList) {
  const byPair = new Map()
  for (const theme of flatList) {
    const pairKey = normalizedModulePairKey(theme.module_pair)
    if (!byPair.has(pairKey)) {
      byPair.set(pairKey, {
        module_key: theme.module_key,
        module_pair: pairKey,
        name: theme.name,
        description: theme.description || '',
        is_active: false,
        is_default: false,
        variants: { light: null, dark: null },
      })
    }
    const pair = byPair.get(pairKey)
    const slot = theme.base_theme === 'dark' ? 'dark' : 'light'
    pair.variants[slot] = theme
    if (theme.is_active) {
      pair.is_active = true
    }
    if (theme.is_default) {
      pair.is_default = true
    }
    if (theme.name) {
      pair.name = theme.name
    }
  }
  return Array.from(byPair.values())
}

export function normalizeModuleThemesResponse(data) {
  if (!Array.isArray(data) || !data.length) {
    return []
  }
  if (data[0]?.variants) {
    return data.map((pair) => ({
      ...pair,
      module_pair: normalizedModulePairKey(pair.module_pair),
    }))
  }
  return groupFlatThemesToPairs(data)
}

export function snapshotTheme(source) {
  return {
    id: source.id,
    name: source.name,
    description: source.description || '',
    author: source.author || '',
    base_theme: source.base_theme,
    module_key: source.module_key || null,
    module_pair: source.module_pair || 'default',
    colors: normalizeColorMapToHex(source.colors || {}),
    bootstrap_colors: normalizeColorMapToHex(source.bootstrap_colors || {}),
    module_tokens: { ...(source.module_tokens || {}) },
    is_active: Boolean(source.is_active),
    is_default: Boolean(source.is_default),
    is_available: Boolean(source.is_available),
    is_system: Boolean(source.is_system),
  }
}

export function createEmptyDraft({
  DRAFT_THEME_ID,
  baseTheme = 'light',
  isModuleScope = false,
  selectedScope = null,
  activeModuleManifest = null,
} = {}) {
  const manifest = activeModuleManifest
  const lightSpec = manifest?.systemThemes?.find((s) => s.base_theme === 'light')
  const darkSpec = manifest?.systemThemes?.find((s) => s.base_theme === 'dark')
  let colors
  if (baseTheme === 'light' && lightSpec?.colors) {
    colors = { ...lightSpec.colors }
  } else if (baseTheme === 'dark' && darkSpec?.colors) {
    colors = { ...darkSpec.colors }
  } else if (baseTheme === (manifest?.baseTheme || 'light') && manifest?.colors && Object.keys(manifest.colors).length) {
    colors = { ...manifest.colors }
  } else {
    colors = { ...getDefaultColors(baseTheme) }
  }
  return {
    id: DRAFT_THEME_ID,
    name: tGlobal('settings.themes.newThemeName'),
    description: '',
    author: '',
    base_theme: baseTheme,
    module_key: isModuleScope ? selectedScope : null,
    module_pair: 'default',
    colors,
    bootstrap_colors: manifest?.bootstrap_colors ? { ...manifest.bootstrap_colors } : {},
    module_tokens: manifest?.moduleTokens ? { ...manifest.moduleTokens } : {},
    is_active: false,
    is_default: false,
    is_available: false,
    is_system: false,
  }
}

export function createEmptyModulePairDraft({
  DRAFT_THEME_ID,
  selectedScope,
  activeModuleManifest = null,
} = {}) {
  const pairKey = `pair_${Date.now()}`
  const displayName = activeModuleManifest?.displayName || selectedScope
  return {
    module_key: selectedScope,
    module_pair: pairKey,
    name: tGlobal('settings.themes.newPairName', { name: displayName }),
    description: '',
    is_active: false,
    is_system: false,
    variants: {
      light: {
        ...createEmptyDraft({
          DRAFT_THEME_ID,
          baseTheme: 'light',
          isModuleScope: true,
          selectedScope,
          activeModuleManifest,
        }),
        id: null,
        module_pair: pairKey,
        name: tGlobal('settings.themes.newPairName', { name: displayName }),
        is_draft_variant: true,
      },
      dark: {
        ...createEmptyDraft({
          DRAFT_THEME_ID,
          baseTheme: 'dark',
          isModuleScope: true,
          selectedScope,
          activeModuleManifest,
        }),
        id: null,
        module_pair: pairKey,
        name: tGlobal('settings.themes.newPairName', { name: displayName }),
        is_draft_variant: true,
      },
    },
  }
}
