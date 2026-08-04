import { ref, reactive, computed, markRaw, inject } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { confirmAction } from '@/js/utils/confirm.js'
import { logError } from '@/js/utils/logError.js'
import { apiClient } from '@/js/api/manager'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { endpoints } from '@/js/api/endpoints.js'
import { tGlobal } from '@/i18n/index.js'
import {
  getColorDescriptions,
  getBootstrapByCategories,
  previewTheme,
  applyThemeModePreference,
  saveThemeToLocalStorage,
} from '@/js/theme-manager'
import { previewModuleThemeSet, applyModuleThemeSet, normalizeModuleThemeSetPayload, clearModuleTheme } from '@/js/module-theme-manager.js'
import { syncUiSettingsFromStorage } from '@/core/cms/js/uiSettings.js'
import { Sun, Moon } from 'lucide-vue-next'
import { contrastRatio } from './themeContrast.js'
import { createThemeEditorActions } from './themeEditorActions.js'
import { resetSystemThemeRecord } from './themeEditorReset.js'
import {
  pickEditableFields,
  snapshotTheme,
} from './themeEditorModel.js'
import { normalizeThemeAuthorForSave } from './resolveSystemThemeLabel.js'
import { createThemeEditorCatalog } from './useThemeEditorCatalog.js'

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

  /** 'list' — галерея выбора; 'form' — страница редактирования */
  const editorStep = ref('list')

  function openEditorForm() {
    editorStep.value = 'form'
  }

  /** Возврат к выбору тем (в т.ч. из onUndo тоста). */
  function goToThemeList() {
    editorStep.value = 'list'
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

  const isDraftSelected = computed(() => selectedThemeId.value === DRAFT_THEME_ID)
  const isNewTheme = computed(() => isDraftSelected.value)

  /** Темы сайта (включая системные) и модульные пары — палитра редактируется. */
  const canEditCurrentTheme = computed(() => {
    if (isModuleScope.value) {
      return Boolean(selectedPairKey.value)
    }
    return Boolean(selectedThemeId.value)
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

  const catalog = createThemeEditorCatalog({
    DRAFT_THEME_ID,
    activeModuleManifest,
    applyEditorPreview,
    applyThemeToCurrent,
    baselineJson,
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
  })

  const {
    changeEditingVariant,
    changeScope,
    createEmptyDraft,
    createEmptyModulePairDraft,
    displayThemes,
    loadThemes,
    persistCurrentVariantToPair,
    selectModulePair,
    selectTheme,
  } = catalog

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
      author: normalizeThemeAuthorForSave(currentTheme.author),
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
      author: normalizeThemeAuthorForSave(variantData.author ?? currentTheme.author),
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
    goToThemeList,
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
    syncCurrentToDraft,
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
    editorStep,
    goToThemeList,
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
    openEditorForm,
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
