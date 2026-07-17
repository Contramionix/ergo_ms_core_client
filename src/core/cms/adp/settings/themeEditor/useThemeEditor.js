import { ref, reactive, computed, markRaw, inject } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { confirmAction } from '@/js/utils/confirm.js'
import { logError } from '@/js/utils/logError.js'
import { apiClient } from '@/js/api/manager'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import {
  getDefaultColors,
  getColorDescriptions,
  getBootstrapByCategories,
  previewTheme,
  applyThemeModePreference,
  resetPreviewToDefaults,
  getCurrentThemeMode,
  loadThemeFromLocalStorage,
  saveThemeToLocalStorage,
} from '@/js/theme-manager'
import { previewModuleThemeSet, applyModuleThemeSet, normalizeModuleThemeSetPayload, clearModuleTheme } from '@/js/module-theme-manager.js'
import { getThemeDefaultsManager, preloadModuleThemeManifests } from '@/modules/themes/ThemeDefaultsManager.js'
import { syncUiSettingsFromStorage } from '@/core/cms/js/uiSettings.js'
import { Sun, Moon } from 'lucide-vue-next'
import { normalizeColorMapToHex, normalizeColorToHex } from './colorFormat.js'

export const THEME_EDITOR_KEY = 'ergoThemeEditor'

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

function contrastRatio(fg, bg) {
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

function pickEditableFields(source) {
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

export function createThemeEditor() {
  const toast = useToast()

  const BASE_THEME_OPTIONS = [
    { id: 'light', name: 'Светлая', icon: markRaw(Sun) },
    { id: 'dark', name: 'Тёмная', icon: markRaw(Moon) },
  ]

  const DRAFT_THEME_ID = '__draft__'

  // Состояние
  const themes = ref([])
  const selectedThemeId = ref(null)
  const loading = ref(false)
  const saving = ref(false)
  const resettingThemeId = ref(null)
  const showBootstrapColors = ref(false)
  const fileInput = ref(null)
  const draftTheme = ref(null)
  const selectedScope = ref('site')
  const scopeOptions = ref([{ id: 'site', name: 'Сайт' }])
  const activeModuleManifest = ref(null)
  const selectedPairKey = ref(null)
  const editingVariant = ref('light')

  const VARIANT_OPTIONS = [
    { id: 'light', name: 'Светлый вариант', icon: markRaw(Sun) },
    { id: 'dark', name: 'Тёмный вариант', icon: markRaw(Moon) },
  ]

  const isModuleScope = computed(() => selectedScope.value !== 'site')
  const previewModuleKey = computed(() => (isModuleScope.value ? selectedScope.value : null))

  function normalizedModulePairKey(value, fallback = 'default') {
    const text = String(value ?? '').trim()
    return text || fallback
  }

  function groupFlatThemesToPairs(flatList) {
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

  function normalizeModuleThemesResponse(data) {
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

  function buildModuleSetForPreview() {
    const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
    const currentSnapshot = snapshotTheme(currentTheme)
    return {
      module_key: selectedScope.value,
      module_pair: selectedPairKey.value || 'default',
      variants: {
        light: editingVariant.value === 'light'
          ? { ...currentSnapshot, base_theme: 'light' }
          : (pair?.variants?.light || null),
        dark: editingVariant.value === 'dark'
          ? { ...currentSnapshot, base_theme: 'dark' }
          : (pair?.variants?.dark || null),
      },
    }
  }

  function buildPreviewPayload() {
    return {
      base_theme: currentTheme.base_theme,
      colors: { ...currentTheme.colors },
      bootstrap_colors: { ...currentTheme.bootstrap_colors },
      module_key: currentTheme.module_key || null,
      module_pair: currentTheme.module_pair || 'default',
      module_tokens: { ...(currentTheme.module_tokens || {}) },
    }
  }

  function applyEditorPreview() {
    if (previewModuleKey.value) {
      previewModuleThemeSet(previewModuleKey.value, buildModuleSetForPreview(), {
        forceMode: editingVariant.value,
      })
      return
    }
    clearModuleTheme()
    previewTheme(buildPreviewPayload())
  }

  const baselineJson = ref(null)

  function serializeEditableState() {
    if (isModuleScope.value) {
      const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
      const lightSource = editingVariant.value === 'light'
        ? currentTheme
        : (pair?.variants?.light || null)
      const darkSource = editingVariant.value === 'dark'
        ? currentTheme
        : (pair?.variants?.dark || null)
      return JSON.stringify({
        name: currentTheme.name || '',
        description: currentTheme.description || '',
        author: currentTheme.author || '',
        light: pickEditableFields(lightSource),
        dark: pickEditableFields(darkSource),
      })
    }
    return JSON.stringify(pickEditableFields(currentTheme))
  }

  function captureBaseline() {
    baselineJson.value = serializeEditableState()
  }

  const isDirty = computed(() => {
    if (isDraftSelected.value) {
      return true
    }
    if (isModuleScope.value && modulePairHasUnsavedVariant.value) {
      return true
    }
    if (!baselineJson.value || !selectedThemeId.value) {
      return false
    }
    return serializeEditableState() !== baselineJson.value
  })

  const scopeLabel = computed(() => {
    const opt = scopeOptions.value.find((o) => o.id === selectedScope.value)
    return opt?.name || (isModuleScope.value ? selectedScope.value : 'Сайт')
  })

  const previewMeta = computed(() => ({
    scopeId: selectedScope.value,
    scopeLabel: scopeLabel.value,
    isModule: isModuleScope.value,
    moduleKey: previewModuleKey.value,
    variant: isModuleScope.value ? editingVariant.value : currentTheme.base_theme,
    variantLabel: (isModuleScope.value ? editingVariant.value : currentTheme.base_theme) === 'dark'
      ? 'Тёмный'
      : 'Светлый',
  }))

  const textContrast = computed(() => {
    const ratio = contrastRatio(
      currentTheme.colors?.primaryText,
      currentTheme.colors?.background,
    )
    if (ratio == null) {
      return { ratio: null, ok: null, label: '—' }
    }
    const ok = ratio >= 4.5
    return {
      ratio: Math.round(ratio * 10) / 10,
      ok,
      label: ok ? 'Контраст OK' : 'Слабый контраст',
    }
  })

  async function confirmLeaveIfDirty() {
    if (!isDirty.value) {
      return true
    }
    return confirmAction({
      title: 'Несохранённые изменения',
      message: 'Есть несохранённые изменения темы. Уйти без сохранения?',
      confirmText: 'Уйти',
      cancelText: 'Остаться',
      variant: 'warning',
    })
  }

  function applyActivatedTheme(themeData) {
    const normalized = normalizeModuleThemeSetPayload(themeData)
    if (normalized?.module_key) {
      applyModuleThemeSet(normalized.module_key, normalized)
      return
    }
    // Палитра темы + режим шестерёнки: при активации «тёмной» темы
    // нужно выставить preference=dark, иначе restore/sync снова применит light.
    const base = themeData.base_theme === 'dark' ? 'dark' : 'light'
    saveThemeToLocalStorage({
      id: themeData.id,
      name: themeData.name,
      base_theme: base,
      colors: themeData.colors || {},
      bootstrap_colors: themeData.bootstrap_colors || {},
      module_tokens: themeData.module_tokens || {},
    })
    applyThemeModePreference(base)
    syncUiSettingsFromStorage()
  }

  // Текущая редактируемая тема
  const currentTheme = reactive({
    id: null,
    name: '',
    description: '',
    author: '',
    base_theme: 'light',
    module_key: null,
    module_pair: 'default',
    colors: {},
    bootstrap_colors: {},
    module_tokens: {},
    is_active: false,
    is_default: false,
    is_system: false
  })

  // Описания цветов
  const colorDescriptions = getColorDescriptions()
  const bootstrapCategories = getBootstrapByCategories()

  // Вычисляемые свойства
  const isDraftSelected = computed(() => selectedThemeId.value === DRAFT_THEME_ID)
  const isNewTheme = computed(() => isDraftSelected.value)

  /** Системные темы сайта — только активация; модульные — палитра редактируется. */
  const canEditCurrentTheme = computed(() => {
    if (isModuleScope.value) {
      return Boolean(selectedPairKey.value)
    }
    return !currentTheme.is_system
  })

  const isEditingModulePair = computed(() => isModuleScope.value && Boolean(selectedPairKey.value))

  const modulePairHasUnsavedVariant = computed(() => {
    if (!isModuleScope.value || !selectedPairKey.value) {
      return false
    }
    const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
    if (!pair?.variants) {
      return true
    }
    return !pair.variants.light?.id || !pair.variants.dark?.id
  })

  const displayThemes = computed(() => {
    if (isModuleScope.value) {
      const pairs = themes.value.map((pair, index) => {
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
      return pairs
    }

    if (!draftTheme.value) {
      return themes.value
    }

    const source = isDraftSelected.value ? currentTheme : draftTheme.value
    const draft = {
      id: DRAFT_THEME_ID,
      name: source.name || 'Новая тема',
      description: source.description || '',
      base_theme: source.base_theme,
      is_system: false,
      is_active: false,
      is_draft: true,
    }

    return [draft, ...themes.value]
  })

  function createEmptyDraft(baseTheme = 'light') {
    const manifest = activeModuleManifest.value
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
      name: 'Новая тема',
      description: '',
      author: '',
      base_theme: baseTheme,
      module_key: isModuleScope.value ? selectedScope.value : null,
      module_pair: 'default',
      colors,
      bootstrap_colors: manifest?.bootstrap_colors ? { ...manifest.bootstrap_colors } : {},
      module_tokens: manifest?.moduleTokens ? { ...manifest.moduleTokens } : {},
      is_active: false,
      is_default: false,
      is_system: false,
    }
  }

  function createEmptyModulePairDraft() {
    const pairKey = `pair_${Date.now()}`
    const displayName = activeModuleManifest.value?.displayName || selectedScope.value
    return {
      module_key: selectedScope.value,
      module_pair: pairKey,
      name: `Новая пара (${displayName})`,
      description: '',
      is_active: false,
      is_system: false,
      variants: {
        light: {
          ...createEmptyDraft('light'),
          id: null,
          module_pair: pairKey,
          name: `Новая пара (${displayName})`,
          is_draft_variant: true,
        },
        dark: {
          ...createEmptyDraft('dark'),
          id: null,
          module_pair: pairKey,
          name: `Новая пара (${displayName})`,
          is_draft_variant: true,
        },
      },
    }
  }

  function snapshotTheme(source) {
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
      is_system: Boolean(source.is_system),
    }
  }

  function applyThemeToCurrent(theme) {
    Object.assign(currentTheme, snapshotTheme(theme))
  }

  function syncCurrentToDraft() {
    if (!draftTheme.value) {
      return
    }
    draftTheme.value = snapshotTheme(currentTheme)
    draftTheme.value.id = DRAFT_THEME_ID
    draftTheme.value.is_active = false
    draftTheme.value.is_default = false
    draftTheme.value.is_system = false
  }

  const loadThemes = async () => {
    loading.value = true
    try {
      await initEndpoints()
      const params = selectedScope.value === 'site'
        ? { module: 'site' }
        : { module: selectedScope.value, as_pairs: 'true' }
      const res = await apiClient.get(endpoints.themes.list, params)
      if (res.success) {
        themes.value = isModuleScope.value
          ? normalizeModuleThemesResponse(res.data || [])
          : (res.data || [])

        if (themes.value.length === 0 && selectedScope.value === 'site') {
          await createSystemThemes()
        } else if (themes.value.length === 0 && isModuleScope.value) {
          await syncModuleDefaults()
        }

        if (isModuleScope.value) {
          const initialPair = themes.value.find((p) => p.is_active) || themes.value[0]
          if (initialPair) {
            selectModulePair(initialPair, 'light', { preview: false })
          }
          return
        }

        const initialTheme = pickInitialTheme(themes.value)
        if (initialTheme) {
          selectTheme(initialTheme, { preview: false })
        }
      }
    } catch (e) {
      logError('Ошибка загрузки тем:', e)
      toast.error('Ошибка загрузки списка тем')
    } finally {
      loading.value = false
    }
  }

  const syncModuleDefaults = async () => {
    try {
      await preloadModuleThemeManifests()
      const manager = getThemeDefaultsManager()
      const manifests = await manager.getAll()
      const res = await apiClient.post(endpoints.themes.syncModuleDefaults, { manifests })
      if (res.success) {
        const listRes = await apiClient.get(endpoints.themes.list, {
          module: selectedScope.value,
          as_pairs: 'true',
        })
        if (listRes.success) {
          themes.value = normalizeModuleThemesResponse(listRes.data || [])
        }
      }
    } catch (e) {
      logError('Ошибка синхронизации модульных тем:', e)
    }
  }

  const changeScope = async (scopeId) => {
    selectedScope.value = scopeId || 'site'
    draftTheme.value = null
    selectedThemeId.value = null
    selectedPairKey.value = null
    editingVariant.value = 'light'
    if (isModuleScope.value) {
      const manager = getThemeDefaultsManager()
      activeModuleManifest.value = await manager.getByModuleKey(selectedScope.value)
    } else {
      activeModuleManifest.value = null
    }
    await loadThemes()
  }

  // Создание/обновление системных тем
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

  // Сброс системной темы (сайт — одна запись; модуль — пара light+dark)
  const resetSystemTheme = async (theme) => {
    if (!theme.is_system && !theme.is_pair) {
      return
    }

    const ok = await confirmAction({
      title: 'Сброс темы',
      message: `Сбросить тему «${theme.name}» к начальным значениям?`,
      confirmText: 'Сбросить',
      cancelText: 'Отмена',
      variant: 'warning',
    })
    if (!ok) {
      return
    }

    const ids = theme.is_pair
      ? [theme.variants?.light?.id, theme.variants?.dark?.id].filter(Boolean)
      : [theme.id]

    resettingThemeId.value = theme.id || theme.module_pair
    try {
      for (const id of ids) {
        const res = await apiClient.post(endpoints.themes.resetDefaults(id))
        if (!res.success) {
          toast.error(res.message || 'Ошибка сброса темы')
          return
        }
      }
      toast.success(`Тема «${theme.name}» сброшена к начальным значениям`)
      await loadThemes()
      if (theme.is_pair) {
        const refreshed = themes.value.find((p) => p.module_pair === theme.module_pair)
        if (refreshed) {
          selectModulePair(refreshed, editingVariant.value, { preview: false })
          if (refreshed.is_active) {
            applyActivatedTheme(refreshed)
          }
        }
        return
      }
      const resetTheme = themes.value.find((t) => t.id === theme.id)
      if (resetTheme) {
        selectTheme(resetTheme)
        if (resetTheme.is_active) {
          applyActivatedTheme(resetTheme)
        }
      }
    } catch (e) {
      logError('Ошибка сброса темы:', e)
      toast.error('Ошибка сброса темы')
    } finally {
      resettingThemeId.value = null
    }
  }

  // Выбор темы в списке при первой загрузке (без смены глобальной темы)
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

  // Выбор пары модульных тем
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
    pair.variants[editingVariant.value] = { ...existing, ...snapshot, base_theme: editingVariant.value }
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

  // Выбор темы для редактирования
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
      author: theme.author || '',
      base_theme: theme.base_theme,
      module_key: theme.module_key || null,
      module_pair: theme.module_pair || 'default',
      colors: normalizeColorMapToHex(colors),
      bootstrap_colors: normalizeColorMapToHex(theme.bootstrap_colors || {}),
      module_tokens: theme.module_tokens ? { ...theme.module_tokens } : {},
      is_active: theme.is_active,
      is_default: theme.is_default,
      is_system: theme.is_system,
    })

    if (preview) {
      applyEditorPreview()
    }
    captureBaseline()
  }

  async function syncPairMetadataToSibling() {
    if (!isModuleScope.value || !selectedPairKey.value) {
      return
    }
    const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
    if (!pair?.variants) {
      return
    }
    const otherVariant = editingVariant.value === 'light' ? 'dark' : 'light'
    const sibling = pair.variants[otherVariant]
    if (!sibling?.id) {
      return
    }
    await apiClient.put(endpoints.themes.update(sibling.id), {
      name: currentTheme.name,
      description: currentTheme.description,
      author: currentTheme.author,
      base_theme: otherVariant,
      module_key: currentTheme.module_key || selectedScope.value,
      module_pair: currentTheme.module_pair || selectedPairKey.value,
      colors: sibling.colors || {},
      bootstrap_colors: sibling.bootstrap_colors || {},
      module_tokens: sibling.module_tokens || {},
    })
  }

  async function persistVariantRecord(variantKey, variantData) {
    const payload = {
      name: variantData.name || currentTheme.name,
      description: variantData.description ?? currentTheme.description,
      author: variantData.author ?? currentTheme.author,
      base_theme: variantKey,
      module_key: variantData.module_key || selectedScope.value,
      module_pair: variantData.module_pair || selectedPairKey.value,
      colors: variantData.colors || {},
      bootstrap_colors: variantData.bootstrap_colors || {},
      module_tokens: variantData.module_tokens || {},
    }

    if (variantData.id) {
      return apiClient.put(endpoints.themes.update(variantData.id), payload)
    }
    return apiClient.post(endpoints.themes.create, payload)
  }

  // Создание новой темы
  const createNewTheme = () => {
    if (isModuleScope.value) {
      const draftPair = createEmptyModulePairDraft()
      themes.value = [draftPair, ...themes.value]
      selectModulePair({
        ...draftPair,
        module_pair: draftPair.module_pair,
        is_pair: true,
        is_draft_pair: true,
      }, 'light')
      return
    }
    if (draftTheme.value) {
      selectTheme({ id: DRAFT_THEME_ID })
      return
    }

    draftTheme.value = createEmptyDraft()
    selectTheme({ id: DRAFT_THEME_ID })
  }

  const discardModulePairDraft = async () => {
    if (!isModuleScope.value || !modulePairHasUnsavedVariant.value) {
      return
    }
    const ok = await confirmAction({
      title: 'Удаление черновика',
      message: 'Удалить несохранённую пару тем?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
    })
    if (!ok) {
      return
    }
    themes.value = themes.value.filter((p) => p.module_pair !== selectedPairKey.value)
    const fallback = themes.value[0]
    if (fallback) {
      selectModulePair(fallback, 'light', { preview: false })
      return
    }
    selectedPairKey.value = null
    selectedThemeId.value = null
  }

  const discardDraft = async () => {
    const ok = await confirmAction({
      title: 'Удаление черновика',
      message: 'Удалить несохранённый черновик темы?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
    })
    if (!ok) {
      return
    }

    const wasSelected = isDraftSelected.value
    draftTheme.value = null

    if (!wasSelected) {
      return
    }

    const fallback = themes.value[0]
    if (fallback) {
      selectTheme(fallback, { preview: false })
      return
    }

    selectedThemeId.value = null
  }

  // Смена базовой темы
  const changeBaseTheme = (base) => {
    if (isModuleScope.value) {
      changeEditingVariant(base)
      return
    }
    currentTheme.base_theme = base
    // Сбрасываем цвета к начальным для новой базовой темы
    if (!currentTheme.is_system) {
      currentTheme.colors = { ...getDefaultColors(base) }
      currentTheme.bootstrap_colors = {}
    }
    applyEditorPreview()
  }

  const updateColor = (key, value) => {
    currentTheme.colors[key] = normalizeColorToHex(value)
    applyEditorPreview()
  }

  const updateBootstrapColor = (key, value) => {
    if (!currentTheme.bootstrap_colors) {
      currentTheme.bootstrap_colors = {}
    }
    currentTheme.bootstrap_colors[key] = normalizeColorToHex(value)
    applyEditorPreview()
  }

  const updateModuleToken = (key, value) => {
    if (!currentTheme.module_tokens) {
      currentTheme.module_tokens = {}
    }
    // Цветоподобные токены — к hex; тени и прочее оставляем как есть
    const trimmed = String(value || '').trim()
    currentTheme.module_tokens[key] = isColorLikeToken(trimmed)
      ? normalizeColorToHex(trimmed)
      : value
    applyEditorPreview()
  }

  const moduleTokenEntries = computed(() => {
    const tokens = currentTheme.module_tokens || {}
    return Object.keys(tokens)
      .filter((key) => key)
      .map((key) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        value: tokens[key],
      }))
  })

  // Получить значение по умолчанию для Bootstrap переменной
  const getDefaultValue = (key) => {
    const categories = getBootstrapByCategories()
    const base = isModuleScope.value ? editingVariant.value : currentTheme.base_theme
    const defaultKey = base === 'dark' ? 'darkDefault' : 'lightDefault'
  
    for (const category of Object.values(categories)) {
      if (category.variables && category.variables[key]) {
        return category.variables[key][defaultKey] || ''
      }
    }
    return ''
  }

  // Сброс к начальным значениям из _theme.scss (только превью редактора)
  const resetToDefaults = () => {
    if (!canEditCurrentTheme.value) {
      return
    }
    const base = isModuleScope.value ? editingVariant.value : currentTheme.base_theme
    const defaults = resetPreviewToDefaults(base)
    currentTheme.colors = { ...defaults.colors }
    currentTheme.bootstrap_colors = {}
    applyEditorPreview()
    toast.success(`Вариант «${base === 'dark' ? 'тёмный' : 'светлый'}» сброшен к начальным значениям`)
  }

  // Сохранение текущего варианта (модуль) или темы (сайт)
  const saveTheme = async () => {
    if (!currentTheme.name.trim()) {
      toast.error('Укажите название темы')
      return
    }
  
    saving.value = true
    try {
      persistCurrentVariantToPair()

      if (isModuleScope.value) {
        const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
        const variantSnapshot = snapshotTheme(currentTheme)
        variantSnapshot.base_theme = editingVariant.value
        const res = await persistVariantRecord(editingVariant.value, variantSnapshot)
        if (!res.success) {
          toast.error(res.message || 'Ошибка сохранения')
          return
        }

        if (pair?.variants) {
          pair.variants[editingVariant.value] = {
            ...(pair.variants[editingVariant.value] || {}),
            ...res.data,
          }
          pair.name = currentTheme.name
        }

        await syncPairMetadataToSibling()
        toast.success(
          `Сохранён ${editingVariant.value === 'dark' ? 'тёмный' : 'светлый'} вариант`,
        )

        const savedPairKey = currentTheme.module_pair || selectedPairKey.value
        await loadThemes()
        const savedPair = themes.value.find((p) => p.module_pair === savedPairKey)
        if (savedPair) {
          selectModulePair(savedPair, editingVariant.value)
          if (savedPair.is_active) {
            applyActivatedTheme(savedPair)
          }
        }
        return
      }

      const data = {
        name: currentTheme.name,
        description: currentTheme.description,
        author: currentTheme.author,
        base_theme: isModuleScope.value ? editingVariant.value : currentTheme.base_theme,
        module_key: currentTheme.module_key || null,
        module_pair: currentTheme.module_pair || 'default',
        colors: currentTheme.colors,
        bootstrap_colors: currentTheme.bootstrap_colors,
        module_tokens: currentTheme.module_tokens || {},
      }
    
      let res
      if (isDraftSelected.value) {
        syncCurrentToDraft()
        res = await apiClient.post(endpoints.themes.create, data)
      } else if (currentTheme.id) {
        res = await apiClient.put(endpoints.themes.update(currentTheme.id), data)
      } else {
        res = await apiClient.post(endpoints.themes.create, data)
      }
    
      if (res.success) {
        toast.success('Тема сохранена')
        draftTheme.value = null
        const savedPairKey = isModuleScope.value ? (currentTheme.module_pair || selectedPairKey.value) : null
        const savedId = res.data?.id || currentTheme.id
        await loadThemes()
        if (isModuleScope.value && savedPairKey) {
          const savedPair = themes.value.find((p) => p.module_pair === savedPairKey)
          if (savedPair) {
            selectModulePair(savedPair, editingVariant.value)
            if (savedPair.is_active) {
              applyActivatedTheme(savedPair)
            }
          }
          return
        }
        const savedTheme = themes.value.find((t) => t.id === savedId)
          || themes.value.find((t) => t.name === data.name)
        if (savedTheme) {
          selectTheme(savedTheme)
          if (savedTheme.is_active) {
            applyActivatedTheme(savedTheme)
          }
        }
      } else {
        toast.error(res.message || 'Ошибка сохранения')
      }
    } catch (e) {
      toast.error(e.message || 'Ошибка сохранения темы')
    } finally {
      saving.value = false
    }
  }

  const saveModulePair = async () => {
    if (!isModuleScope.value || !selectedPairKey.value) {
      return
    }
    if (!currentTheme.name.trim()) {
      toast.error('Укажите название темы')
      return
    }

    saving.value = true
    try {
      persistCurrentVariantToPair()
      const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
      if (!pair?.variants) {
        toast.error('Пара тем не найдена')
        return
      }

      for (const variantKey of ['light', 'dark']) {
        const source = variantKey === editingVariant.value
          ? snapshotTheme(currentTheme)
          : snapshotTheme(pair.variants[variantKey] || createEmptyDraft(variantKey))
        source.name = currentTheme.name
        source.description = currentTheme.description
        source.author = currentTheme.author
        source.module_key = selectedScope.value
        source.module_pair = selectedPairKey.value
        source.base_theme = variantKey

        const res = await persistVariantRecord(variantKey, source)
        if (!res.success) {
          toast.error(res.message || `Ошибка сохранения ${variantKey}-варианта`)
          return
        }
        pair.variants[variantKey] = res.data
      }

      toast.success('Светлый и тёмный варианты сохранены')
      const savedPairKey = selectedPairKey.value
      await loadThemes()
      const savedPair = themes.value.find((p) => p.module_pair === savedPairKey)
      if (savedPair) {
        selectModulePair(savedPair, editingVariant.value)
        if (savedPair.is_active) {
          applyActivatedTheme(savedPair)
        }
      }
    } catch (e) {
      toast.error(e.message || 'Ошибка сохранения пары')
    } finally {
      saving.value = false
    }
  }

  // Активация темы
  const activateTheme = async (theme) => {
    try {
      const themeId = theme.is_pair
        ? (theme.variants?.light?.id || theme.variants?.dark?.id)
        : theme.id
      if (!themeId) {
        toast.error('Не найден вариант темы для активации')
        return
      }
      const res = await apiClient.post(endpoints.themes.activate(themeId))
      if (res.success) {
        toast.success(`Тема "${theme.name}" активирована`)
        await loadThemes()
        applyActivatedTheme(res.data)
        if (isModuleScope.value && res.data?.module_pair) {
          const pair = themes.value.find((p) => p.module_pair === res.data.module_pair) || res.data
          selectModulePair(pair, editingVariant.value, { preview: false })
        } else if (!isModuleScope.value) {
          selectTheme(res.data)
        }
      }
    } catch {
      toast.error('Ошибка активации темы')
    }
  }

  // Дублирование темы
  const duplicateTheme = async (theme) => {
    if (isModuleScope.value) {
      toast.info('Дублирование пар модульных тем пока не поддерживается')
      return
    }
    try {
      const res = await apiClient.post(endpoints.themes.duplicate(theme.id), {
        name: `${theme.name} (копия)`
      })
      if (res.success) {
        toast.success('Копия создана')
        await loadThemes()
        selectTheme(res.data)
      }
    } catch {
      toast.error('Ошибка создания копии')
    }
  }

  const deleteTheme = async (theme) => {
    if (theme.is_system || theme.is_pair) {
      toast.error('Нельзя удалить системную тему')
      return
    }

    const ok = await confirmAction({
      title: 'Удаление темы',
      message: `Вы уверены, что хотите удалить тему "${theme.name}"?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      variant: 'danger',
    })
    if (!ok) return

    try {
      const res = await apiClient.delete(endpoints.themes.delete(theme.id))
      if (res.success) {
        toast.success('Тема удалена')
        await loadThemes()
      }
    } catch {
      toast.error('Ошибка удаления темы')
    }
  }

  // Экспорт темы
  const exportTheme = async () => {
    if (!currentTheme.id || isDraftSelected.value) {
      // Экспорт несохраненной темы
      const data = {
        name: currentTheme.name,
        description: currentTheme.description,
        author: currentTheme.author,
        base_theme: currentTheme.base_theme,
        module_key: currentTheme.module_key,
        colors: currentTheme.colors,
        bootstrap_colors: currentTheme.bootstrap_colors,
        module_tokens: currentTheme.module_tokens,
        version: '1.1',
        exported_at: new Date().toISOString()
      }
    
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentTheme.name || 'theme'}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Тема экспортирована')
      return
    }
  
    try {
      const res = await apiClient.downloadFile(endpoints.themes.export(currentTheme.id))
      if (!res.success || !res.data) {
        toast.error(res.message || 'Ошибка экспорта темы')
        return
      }
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentTheme.name || 'theme'}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Тема экспортирована')
    } catch {
      toast.error('Ошибка экспорта темы')
    }
  }

  // Импорт темы
  const importTheme = () => {
    fileInput.value?.click()
  }

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
  
    try {
      const uploadResult = await mediaApiClient.upload(file, {
        targetDir: 'imports/themes',
        allowedTypes: ['json'],
      })

      const res = await apiClient.post(endpoints.themes.import, {
        file_path: uploadResult.path,
      })
    
      if (res.success) {
        toast.success('Тема импортирована')
        await loadThemes()
        selectTheme(res.data)
      } else {
        toast.error(res.message || 'Ошибка импорта')
      }
    } catch (e) {
      toast.error(e.message || 'Ошибка импорта темы')
    }
  
    // Сброс input
    event.target.value = ''
  }

  async function init() {
    await preloadModuleThemeManifests()
    const manager = getThemeDefaultsManager()
    scopeOptions.value = await manager.getScopeOptions()
    await loadThemes()
  }

  return {
    BASE_THEME_OPTIONS,
    VARIANT_OPTIONS,
    activateTheme,
    applyEditorPreview,
    bootstrapCategories,
    changeBaseTheme,
    changeEditingVariant,
    canEditCurrentTheme,
    changeScope,
    confirmLeaveIfDirty,
    selectedScope,
    scopeOptions,
    scopeLabel,
    isModuleScope,
    isDirty,
    colorDescriptions,
    createNewTheme,
    currentTheme,
    deleteTheme,
    discardDraft,
    discardModulePairDraft,
    displayThemes,
    duplicateTheme,
    exportTheme,
    fileInput,
    getDefaultValue,
    handleFileImport,
    importTheme,
    init,
    isNewTheme,
    loading,
    moduleTokenEntries,
    isEditingModulePair,
    modulePairHasUnsavedVariant,
    previewMeta,
    previewModuleKey,
    resetSystemTheme,
    resetToDefaults,
    resettingThemeId,
    saveTheme,
    saveModulePair,
    saving,
    selectTheme,
    selectedThemeId,
    selectedPairKey,
    editingVariant,
    showBootstrapColors,
    textContrast,
    updateBootstrapColor,
    updateColor,
    updateModuleToken,
  }
}

export function useThemeEditor() {
  const editor = inject(THEME_EDITOR_KEY, null)
  if (!editor) {
    throw new Error('useThemeEditor: ParentLayout должен предоставить createThemeEditor()')
  }
  return editor
}
