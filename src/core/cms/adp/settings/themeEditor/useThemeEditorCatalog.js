import { computed } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import { apiClient } from '@/js/api/manager'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import { tGlobal } from '@/i18n/index.js'
import {
  getDefaultColors,
  getCurrentThemeMode,
  loadThemeFromLocalStorage,
} from '@/js/theme-manager'
import { normalizeColorMapToHex } from './colorFormat.js'
import {
  createEmptyDraft as buildEmptyDraft,
  createEmptyModulePairDraft as buildEmptyModulePairDraft,
  normalizedModulePairKey,
  snapshotTheme,
} from './themeEditorModel.js'
import { resolveThemeDisplayAuthor } from './resolveSystemThemeLabel.js'

export function createThemeEditorCatalog(ctx) {
  const toast = useToast()

  const {
    DRAFT_THEME_ID,
    activeModuleManifest,
    applyEditorPreview,
    applyThemeToCurrent,
    captureBaseline,
    currentTheme,
    draftTheme,
    editingVariant,
    isModuleScope,
    loading,
    selectedPairKey,
    selectedScope,
    selectedThemeId,
    syncCurrentToDraft,
    themes,
  } = ctx

  const isDraftSelected = computed(() => selectedThemeId.value === DRAFT_THEME_ID)

  const displayThemes = computed(() => {
    if (isModuleScope.value) {
      return themes.value.map((pair, index) => {
        const pairKey = normalizedModulePairKey(pair.module_pair, `pair-${index}`)
        return {
          id: `${selectedScope.value}-${pairKey}`,
          module_pair: pairKey,
          name: pair.name || pairKey,
          description: pair.variants?.light?.description || pair.variants?.dark?.description || '',
          is_active: pair.is_active,
          is_system: Boolean(pair.variants?.light?.is_system || pair.variants?.dark?.is_system),
          is_draft_pair: !pair.variants?.light?.id && !pair.variants?.dark?.id,
          variants: pair.variants,
          is_pair: true,
        }
      })
    }

    if (!draftTheme.value) {
      return themes.value
    }

    const source = isDraftSelected.value ? currentTheme : draftTheme.value
    const draft = {
      id: DRAFT_THEME_ID,
      name: source.name || tGlobal('settings.themes.newThemeName'),
      description: source.description || '',
      base_theme: source.base_theme,
      is_system: false,
      is_active: false,
      is_draft: true,
    }

    return [draft, ...themes.value]
  })

  function createEmptyDraft(baseTheme = 'light') {
    return buildEmptyDraft({
      DRAFT_THEME_ID,
      baseTheme,
      isModuleScope: isModuleScope.value,
      selectedScope: selectedScope.value,
      activeModuleManifest: activeModuleManifest.value,
    })
  }

  function createEmptyModulePairDraft() {
    return buildEmptyModulePairDraft({
      DRAFT_THEME_ID,
      selectedScope: selectedScope.value,
      activeModuleManifest: activeModuleManifest.value,
    })
  }

  function pickInitialTheme(themeList) {
    if (!themeList.length) {
      return null
    }

    const active = themeList.find((t) => t.is_active)
    if (active) {
      return active
    }

    const saved = loadThemeFromLocalStorage()
    if (saved?.id) {
      const byId = themeList.find((t) => t.id === saved.id)
      if (byId) {
        return byId
      }
    }

    const mode = getCurrentThemeMode()
    const byMode = themeList.find((t) => t.base_theme === mode)
    if (byMode) {
      return byMode
    }

    return themeList[0]
  }

  const loadThemes = async () => {
    loading.value = true
    try {
      await initEndpoints()
      const params = { module: 'site' }
      const res = await apiClient.get(endpoints.themes.list, params)
      if (res.success) {
        themes.value = res.data || []

        if (themes.value.length === 0) {
          await createSystemThemes()
        }

        const initialTheme = pickInitialTheme(themes.value)
        if (initialTheme) {
          selectTheme(initialTheme, { preview: false })
        }
      }
    } catch (e) {
      logError('Ошибка загрузки тем:', e)
      toast.error(tGlobal('settings.themes.loadError'))
    } finally {
      loading.value = false
    }
  }

  const createSystemThemes = async () => {
    try {
      await apiClient.post(endpoints.themes.createSystemThemes)
      const res = await apiClient.get(endpoints.themes.list)
      if (res.success) {
        themes.value = res.data || []
      }
    } catch (e) {
      logError('Ошибка создания системных тем:', e)
    }
  }

  const changeScope = async () => {
    selectedScope.value = 'site'
    draftTheme.value = null
    selectedThemeId.value = null
    selectedPairKey.value = null
    editingVariant.value = 'light'
    activeModuleManifest.value = null
    await loadThemes()
  }

  function persistCurrentVariantToPair() {
    if (!isModuleScope.value || !selectedPairKey.value) {
      return
    }
    const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
    if (!pair?.variants) {
      return
    }
    const snapshot = snapshotTheme(currentTheme)
    const existing = pair.variants[editingVariant.value] || {}
    pair.variants[editingVariant.value] = {
      ...existing,
      ...snapshot,
      base_theme: editingVariant.value,
    }
    pair.name = currentTheme.name || pair.name
  }

  const selectModulePair = (pair, variant = 'light', { preview = true, resetBaseline = true } = {}) => {
    persistCurrentVariantToPair()

    const pairKey = normalizedModulePairKey(pair.module_pair)
    selectedPairKey.value = pairKey
    selectedThemeId.value = `${selectedScope.value}-${pairKey}`
    editingVariant.value = variant

    const variantData = pair.variants?.[variant]
    if (variantData) {
      applyThemeToCurrent(variantData)
      currentTheme.module_pair = pairKey
      currentTheme.base_theme = variant
      if (pair.name) {
        currentTheme.name = pair.name
      }
    } else {
      const draft = createEmptyDraft(variant)
      draft.module_pair = pairKey
      draft.name = pair.name || draft.name
      draft.base_theme = variant
      applyThemeToCurrent(draft)
    }

    if (preview) {
      applyEditorPreview()
    }
    if (resetBaseline) {
      captureBaseline()
    }
  }

  const changeEditingVariant = (variant) => {
    if (!isModuleScope.value || variant === editingVariant.value) {
      return
    }
    const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
    if (!pair) {
      return
    }
    selectModulePair(pair, variant, { resetBaseline: false })
  }

  const selectTheme = (theme, { preview = true } = {}) => {
    if (theme?.is_pair) {
      selectModulePair(theme, editingVariant.value, { preview })
      return
    }
    if (isDraftSelected.value) {
      syncCurrentToDraft()
    }

    if (theme.id === DRAFT_THEME_ID) {
      if (!draftTheme.value) {
        return
      }
      selectedThemeId.value = DRAFT_THEME_ID
      applyThemeToCurrent(draftTheme.value)
      if (preview) {
        applyEditorPreview()
      }
      return
    }

    selectedThemeId.value = theme.id

    const colors = theme.colors && Object.keys(theme.colors).length > 0
      ? { ...theme.colors }
      : { ...getDefaultColors(theme.base_theme) }

    Object.assign(currentTheme, {
      id: theme.id,
      name: theme.name,
      description: theme.description || '',
      author: resolveThemeDisplayAuthor(theme.author || ''),
      base_theme: theme.base_theme,
      module_key: theme.module_key || null,
      module_pair: theme.module_pair || 'default',
      colors: normalizeColorMapToHex(colors),
      bootstrap_colors: normalizeColorMapToHex(theme.bootstrap_colors || {}),
      module_tokens: theme.module_tokens ? { ...theme.module_tokens } : {},
      is_active: theme.is_active,
      is_default: theme.is_default,
      is_available: theme.is_available,
      is_system: theme.is_system,
    })

    if (preview) {
      applyEditorPreview()
    }
    captureBaseline()
  }

  return {
    changeEditingVariant,
    changeScope,
    createEmptyDraft,
    createEmptyModulePairDraft,
    createSystemThemes,
    displayThemes,
    isDraftSelected,
    loadThemes,
    persistCurrentVariantToPair,
    pickInitialTheme,
    selectModulePair,
    selectTheme,
  }
}
