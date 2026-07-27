import { ref, reactive, computed, markRaw, inject } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { confirmAction } from '@/js/utils/confirm.js'
import { logError } from '@/js/utils/logError.js'
import { apiClient } from '@/js/api/manager'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import { tGlobal } from '@/i18n/index.js'
import {
  getDefaultColors,
  getColorDescriptions,
  getBootstrapByCategories,
  previewTheme,
  applyThemeModePreference,
  getCurrentThemeMode,
  loadThemeFromLocalStorage,
  saveThemeToLocalStorage,
} from '@/js/theme-manager'
import { previewModuleThemeSet, applyModuleThemeSet, normalizeModuleThemeSetPayload, clearModuleTheme } from '@/js/module-theme-manager.js'
import { syncUiSettingsFromStorage } from '@/core/cms/js/uiSettings.js'
import { Sun, Moon } from 'lucide-vue-next'
import { normalizeColorMapToHex } from './colorFormat.js'
import { contrastRatio } from './themeContrast.js'
import { createThemeEditorActions } from './themeEditorActions.js'
import { resetSystemThemeRecord } from './themeEditorReset.js'
import {
  createEmptyDraft as buildEmptyDraft,
  createEmptyModulePairDraft as buildEmptyModulePairDraft,
  normalizedModulePairKey,
  pickEditableFields,
  snapshotTheme,
} from './themeEditorModel.js'

export const THEME_EDITOR_KEY = 'ergoThemeEditor'

export { isColorLikeToken } from './themeContrast.js'

export function createThemeEditor() {
  const toast = useToast()

  const BASE_THEME_OPTIONS = [
    { id: 'light', name: tGlobal('settings.themes.lightMode'), icon: markRaw(Sun) },
    { id: 'dark', name: tGlobal('settings.themes.darkMode'), icon: markRaw(Moon) },
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
  const scopeOptions = ref([{ id: 'site', name: tGlobal('settings.themes.site') }])
  const activeModuleManifest = ref(null)
  const selectedPairKey = ref(null)
  const editingVariant = ref('light')

  const VARIANT_OPTIONS = [
    { id: 'light', name: tGlobal('settings.themes.lightVariant'), icon: markRaw(Sun) },
    { id: 'dark', name: tGlobal('settings.themes.darkVariant'), icon: markRaw(Moon) },
  ]
  const isModuleScope = computed(() => false)
  const previewModuleKey = computed(() => null)

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
    return opt?.name || (isModuleScope.value ? selectedScope.value : tGlobal('settings.themes.site'))
  })

  const previewMeta = computed(() => ({
    scopeId: selectedScope.value,
    scopeLabel: scopeLabel.value,
    isModule: isModuleScope.value,
    moduleKey: previewModuleKey.value,
    variant: isModuleScope.value ? editingVariant.value : currentTheme.base_theme,
    variantLabel: (isModuleScope.value ? editingVariant.value : currentTheme.base_theme) === 'dark'
      ? tGlobal('settings.themes.dark')
      : tGlobal('settings.themes.light'),
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
      label: ok ? tGlobal('settings.themes.contrastOk') : tGlobal('settings.themes.contrastWeak'),
    }
  })

  async function confirmLeaveIfDirty() {
    if (!isDirty.value) {
      return true
    }
    return confirmAction({
      title: tGlobal('settings.themes.leaveDirtyTitle'),
      message: tGlobal('settings.themes.leaveDirtyMessage'),
      confirmText: tGlobal('settings.themes.leaveConfirm'),
      cancelText: tGlobal('settings.themes.stayConfirm'),
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
    is_available: false,
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

  const changeScope = async () => {
    selectedScope.value = 'site'
    draftTheme.value = null
    selectedThemeId.value = null
    selectedPairKey.value = null
    editingVariant.value = 'light'
    activeModuleManifest.value = null
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
      is_available: theme.is_available,
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

  const resetSystemTheme = (theme) => resetSystemThemeRecord(theme, {
    apiClient,
    endpoints,
    confirmAction,
    toast,
    logError,
    selectedScope,
    editingVariant,
    themes,
    resettingThemeId,
    loadThemes,
    selectModulePair,
    selectTheme,
    applyActivatedTheme,
  })

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
  const {
    createNewTheme,
    discardModulePairDraft,
    discardDraft,
    changeBaseTheme,
    updateColor,
    updateBootstrapColor,
    updateModuleToken,
    moduleTokenEntries,
    getDefaultValue,
    resetToDefaults,
    saveTheme,
    saveModulePair,
    activateTheme,
    toggleThemeAvailable,
    duplicateTheme,
    deleteTheme,
    exportTheme,
    importTheme,
    handleFileImport,
  } = createThemeEditorActions({
    DRAFT_THEME_ID,
    apiClient,
    applyActivatedTheme,
    applyEditorPreview,
    applyThemeToCurrent,
    canEditCurrentTheme,
    captureBaseline,
    changeEditingVariant,
    confirmAction,
    createEmptyDraft,
    createEmptyModulePairDraft,
    currentTheme,
    draftTheme,
    editingVariant,
    endpoints,
    fileInput,
    isDraftSelected,
    isModuleScope,
    isNewTheme,
    loadThemes,
    loading,
    logError,
    mediaApiClient,
    modulePairHasUnsavedVariant,
    persistCurrentVariantToPair,
    persistVariantRecord,
    resettingThemeId,
    saving,
    selectModulePair,
    selectTheme,
    selectedPairKey,
    selectedScope,
    selectedThemeId,
    snapshotTheme,
    syncPairMetadataToSibling,
    themes,
    toast,
  })

  async function init() {
    selectedScope.value = 'site'
    scopeOptions.value = [{ id: 'site', name: tGlobal('settings.themes.site') }]
    await loadThemes()
  }

  return {
    BASE_THEME_OPTIONS,
    VARIANT_OPTIONS,
    activateTheme,
    toggleThemeAvailable,
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
  if (!editor) throw new Error('useThemeEditor: ParentLayout must provide createThemeEditor()')
  return editor
}
