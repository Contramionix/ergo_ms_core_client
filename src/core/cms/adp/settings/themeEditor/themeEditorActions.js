/** Theme editor create/save/import/export actions. */

import { computed } from 'vue'
import {
  getDefaultColors,
  getBootstrapByCategories,
  resetPreviewToDefaults,
} from '@/js/theme-manager'
import { isColorLikeToken } from './themeContrast.js'
import { normalizeColorToHex } from './colorFormat.js'

export function createThemeEditorActions(ctx) {
  const {
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
  } = ctx

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


  return {
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
    duplicateTheme,
    deleteTheme,
    exportTheme,
    importTheme,
    handleFileImport,
  }
}
