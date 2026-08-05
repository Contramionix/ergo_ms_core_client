/** Theme editor create/save/import/export actions. */

import { computed } from 'vue'
import { tGlobal } from '@/i18n/index.js'
import {
  getDefaultColors,
  getBootstrapByCategories,
  resetPreviewToDefaults,
} from '@/js/theme-manager'
import { clientEnv } from '@/js/clientEnv.js'
import { showUndoableSuccess } from '@/js/utils/toast.js'
import { isColorLikeToken } from './themeContrast.js'
import { normalizeColorToHex } from './colorFormat.js'
import {
  normalizeThemeAuthorForSave,
  resolveThemeDisplayName,
} from './resolveSystemThemeLabel.js'
import { themeUndoAudit } from './themeUndoAudit.js'
import { THEME_UNDO_GROUPS } from './themeUndoGroups.js'

export function createThemeEditorActions(ctx) {
  const {
    DRAFT_THEME_ID,
    apiClient,
    applyActivatedTheme,
    applyEditorPreview,
    canEditCurrentTheme,
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
    loadThemes,
    mediaApiClient,
    modulePairHasUnsavedVariant,
    persistCurrentVariantToPair,
    persistVariantRecord,
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
  } = ctx

  function patchSiteDefaultLocally(restoreId, serverTheme = null) {
    themes.value = themes.value.map((t) => {
      if (t.is_pair) {
        return t
      }
      if (t.id === restoreId) {
        return {
          ...t,
          ...(serverTheme || {}),
          id: restoreId,
          is_default: true,
          is_active: true,
          is_available: true,
        }
      }
      if (t.is_default || t.is_active) {
        return { ...t, is_default: false, is_active: false }
      }
      return t
    })
    return themes.value.find((t) => t.id === restoreId) || serverTheme
  }

  function patchThemeAvailableLocally(themeId, available, serverTheme = null) {
    themes.value = themes.value.map((t) => {
      if (t.id !== themeId) {
        return t
      }
      return {
        ...t,
        ...(serverTheme || {}),
        id: themeId,
        is_available: available,
      }
    })
    return themes.value.find((t) => t.id === themeId) || serverTheme
  }

  async function restoreSiteDefaultTheme(restoreId, restoreSnapshot) {
    const optimistic = patchSiteDefaultLocally(restoreId, restoreSnapshot)
    if (optimistic) {
      applyActivatedTheme(optimistic)
      selectTheme(optimistic, { preview: false })
    }
    const undoRes = await apiClient.post(endpoints.themes.setDefault(restoreId))
    if (!undoRes.success) {
      toast.error(tGlobal('settings.themes.undoError'))
      throw new Error('undo set-default failed')
    }
    const restored = patchSiteDefaultLocally(restoreId, undoRes.data)
    if (restored) {
      applyActivatedTheme(restored)
      selectTheme(restored, { preview: false })
    }
    return restored
  }

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
      title: tGlobal('settings.themes.deleteDraftTitle'),
      message: tGlobal('settings.themes.deleteDraftPairMessage'),
      confirmText: tGlobal('common.delete'),
      cancelText: tGlobal('common.cancel'),
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
      title: tGlobal('settings.themes.deleteDraftTitle'),
      message: tGlobal('settings.themes.deleteDraftMessage'),
      confirmText: tGlobal('common.delete'),
      cancelText: tGlobal('common.cancel'),
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
    const previousColors = { ...(currentTheme.colors || {}) }
    const previousBootstrap = { ...(currentTheme.bootstrap_colors || {}) }
    const defaults = resetPreviewToDefaults(base)
    currentTheme.colors = { ...defaults.colors }
    currentTheme.bootstrap_colors = {}
    applyEditorPreview()
    const variantLabel = base === 'dark'
      ? tGlobal('settings.themes.darkVariantParen')
      : tGlobal('settings.themes.lightVariantParen')
    showUndoableSuccess(
      tGlobal('settings.themes.variantResetSuccess', { variant: variantLabel }),
      {
        group: THEME_UNDO_GROUPS.preview,
        kind: 'theme.variant_reset',
        undoAudit: themeUndoAudit('variant_reset', currentTheme.name || ''),
        onUndo: async () => {
          currentTheme.colors = { ...previousColors }
          currentTheme.bootstrap_colors = { ...previousBootstrap }
          applyEditorPreview()
          toast.success(tGlobal('settings.themes.undoRestored'))
        },
      },
    )
  }

  // Сохранение текущего варианта (модуль) или темы (сайт)
  const saveTheme = async () => {
    if (!currentTheme.name.trim()) {
      toast.error(tGlobal('settings.themes.nameRequired'))
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
          toast.error(res.message || tGlobal('settings.themes.saveError'))
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
          tGlobal('settings.themes.variantSaved', { variant: editingVariant.value === 'dark' ? tGlobal('settings.themes.darkVariantParen') : tGlobal('settings.themes.lightVariantParen') }),
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
        author: normalizeThemeAuthorForSave(currentTheme.author),
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
        toast.success(tGlobal('settings.themes.themeSaved'))
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
        toast.error(res.message || tGlobal('settings.themes.saveError'))
      }
    } catch (e) {
      toast.error(e.message || tGlobal('settings.themes.themeSaveError'))
    } finally {
      saving.value = false
    }
  }

  const saveModulePair = async () => {
    if (!isModuleScope.value || !selectedPairKey.value) {
      return
    }
    if (!currentTheme.name.trim()) {
      toast.error(tGlobal('settings.themes.nameRequired'))
      return
    }

    saving.value = true
    try {
      persistCurrentVariantToPair()
      const pair = themes.value.find((p) => p.module_pair === selectedPairKey.value)
      if (!pair?.variants) {
        toast.error(tGlobal('settings.themes.pairNotFound'))
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
          toast.error(res.message || tGlobal('settings.themes.variantSaveError', { variant: variantKey }))
          return
        }
        pair.variants[variantKey] = res.data
      }

      toast.success(tGlobal('settings.themes.pairSaved'))
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
      toast.error(e.message || tGlobal('settings.themes.pairSaveError'))
    } finally {
      saving.value = false
    }
  }

  // Стандарт сайта (site) или активация пары модуля
  const activateTheme = async (theme) => {
    try {
      const themeId = theme.is_pair
        ? (theme.variants?.light?.id || theme.variants?.dark?.id)
        : theme.id
      if (!themeId) {
        toast.error(tGlobal('settings.themes.activateVariantMissing'))
        return
      }
      const previousDefault = !isModuleScope.value
        ? themes.value.find((t) => t.is_default && !t.is_pair && t.id !== themeId)
        : null
      const endpoint = isModuleScope.value
        ? endpoints.themes.activate(themeId)
        : endpoints.themes.setDefault(themeId)
      const res = await apiClient.post(endpoint)
      if (res.success) {
        const displayName = resolveThemeDisplayName(theme.name)
        const successMessage = isModuleScope.value
          ? tGlobal('settings.themes.activated', { name: displayName })
          : tGlobal('settings.themes.setAsSiteDefault', { name: displayName })

        if (!isModuleScope.value && previousDefault?.id) {
          const restoreId = previousDefault.id
          const restoreSnapshot = { ...previousDefault }
          showUndoableSuccess(successMessage, {
            group: THEME_UNDO_GROUPS.siteDefault,
            kind: 'theme.set_default',
            stackMax: clientEnv.toastUndoStackMax,
            undoAudit: themeUndoAudit('set_default', restoreSnapshot.name || ''),
            onStackEmpty: () => {
              toast.success(tGlobal('settings.themes.undoRestored'))
            },
            onUndo: async () => {
              try {
                await restoreSiteDefaultTheme(restoreId, restoreSnapshot)
              } catch (e) {
                await loadThemes()
                if (e?.message !== 'undo set-default failed') {
                  toast.error(tGlobal('settings.themes.undoError'))
                }
                throw e
              }
            },
            batchUndo: async (oldestEntry) => {
              const baseline = oldestEntry?.batchContext
              if (!baseline?.restoreId) {
                throw new Error('undo batch baseline missing')
              }
              try {
                await restoreSiteDefaultTheme(baseline.restoreId, baseline.restoreSnapshot)
              } catch (e) {
                await loadThemes()
                throw e
              }
            },
            batchContext: { restoreId, restoreSnapshot },
          })
        } else {
          toast.success(successMessage)
        }

        await loadThemes()
        if (!isModuleScope.value) {
          applyActivatedTheme(res.data)
          selectTheme(res.data)
          return
        }
        applyActivatedTheme(res.data)
        if (res.data?.module_pair) {
          const pair = themes.value.find((p) => p.module_pair === res.data.module_pair) || res.data
          selectModulePair(pair, editingVariant.value, { preview: false })
        }
      }
    } catch {
      toast.error(isModuleScope.value ? tGlobal('settings.themes.activateError') : tGlobal('settings.themes.siteDefaultError'))
    }
  }

  const toggleThemeAvailable = async (theme) => {
    if (isModuleScope.value || theme.is_draft || theme.is_pair) {
      return
    }
    const next = !theme.is_available
    if (!next && theme.is_default) {
      toast.error(tGlobal('settings.themes.cannotRemoveSiteDefault'))
      return
    }
    try {
      const themeId = theme.id
      const res = await apiClient.patch(endpoints.themes.update(themeId), {
        is_available: next,
      })
      if (res.success) {
        const restoreAvailable = !next
        showUndoableSuccess(
          next
            ? tGlobal('settings.themes.addedToQuick')
            : tGlobal('settings.themes.removedFromQuick'),
          {
            group: THEME_UNDO_GROUPS.quickPick,
            kind: 'theme.availability',
            undoAudit: themeUndoAudit('availability', theme.name || ''),
            onUndo: async () => {
              const optimistic = patchThemeAvailableLocally(themeId, restoreAvailable)
              if (selectedThemeId?.value === themeId || currentTheme?.id === themeId) {
                selectTheme(optimistic || { ...theme, is_available: restoreAvailable }, {
                  preview: false,
                })
              }
              try {
                const undoRes = await apiClient.patch(endpoints.themes.update(themeId), {
                  is_available: restoreAvailable,
                })
                if (!undoRes.success) {
                  toast.error(tGlobal('settings.themes.undoError'))
                  throw new Error('undo availability failed')
                }
                const restored = patchThemeAvailableLocally(themeId, restoreAvailable, undoRes.data)
                if (selectedThemeId?.value === themeId || currentTheme?.id === themeId) {
                  selectTheme(restored || undoRes.data, { preview: false })
                }
                toast.success(tGlobal('settings.themes.undoRestored'))
              } catch (e) {
                await loadThemes()
                if (e?.message !== 'undo availability failed') {
                  toast.error(tGlobal('settings.themes.undoError'))
                }
                throw e
              }
            },
          },
        )
        await loadThemes()
        if (selectedThemeId?.value === themeId || currentTheme?.id === themeId) {
          selectTheme(res.data, { preview: false })
        }
      } else {
        toast.error(res.message || res.data?.is_available?.[0] || tGlobal('settings.themes.availabilityError'))
      }
    } catch (e) {
      toast.error(e.message || tGlobal('settings.themes.availabilityError'))
    }
  }

  // Дублирование темы
  const duplicateTheme = async (theme) => {
    if (isModuleScope.value) {
      toast.info(tGlobal('settings.themes.pairDuplicateUnsupported'))
      return
    }
    try {
      const sourceId = theme.id
      const res = await apiClient.post(endpoints.themes.duplicate(sourceId), {
        name: tGlobal('settings.themes.copySuffix', {
          name: resolveThemeDisplayName(theme.name),
        }),
      })
      if (res.success) {
        const copyId = res.data?.id
        if (copyId) {
          showUndoableSuccess(tGlobal('settings.themes.copyCreated'), {
            group: THEME_UNDO_GROUPS.duplicate,
            kind: 'theme.duplicate',
            undoAudit: themeUndoAudit(
              'duplicate',
              res.data?.name || tGlobal('settings.themes.copySuffix', {
                name: resolveThemeDisplayName(theme.name),
              }),
            ),
            onUndo: async () => {
              const siteDefaultBefore = themes.value.find((t) => t.is_default && t.id !== copyId)
                || themes.value.find((t) => t.is_active && t.id !== copyId)
              themes.value = themes.value.filter((t) => t.id !== copyId)
              if (siteDefaultBefore) {
                selectTheme(siteDefaultBefore, { preview: false })
                applyActivatedTheme(siteDefaultBefore)
              }
              goToThemeList?.()
              try {
                const undoRes = await apiClient.delete(endpoints.themes.delete(copyId))
                if (!undoRes.success) {
                  toast.error(tGlobal('settings.themes.undoError'))
                  throw new Error('undo duplicate failed')
                }
                toast.success(tGlobal('settings.themes.undoRestored'))
              } catch (e) {
                await loadThemes()
                if (e?.message !== 'undo duplicate failed') {
                  toast.error(tGlobal('settings.themes.undoError'))
                }
                throw e
              }
            },
          })
        } else {
          toast.success(tGlobal('settings.themes.copyCreated'))
        }
        await loadThemes()
        const copy = themes.value.find((t) => t.id === copyId) || res.data
        selectTheme(copy, { preview: false })
        applyActivatedTheme(copy)
      }
    } catch {
      toast.error(tGlobal('settings.themes.copyError'))
    }
  }

  const deleteTheme = async (theme) => {
    if (theme.is_system || theme.is_pair) {
      toast.error(tGlobal('settings.themes.cannotDeleteSystem'))
      return
    }

    const ok = await confirmAction({
      title: tGlobal('settings.themes.deleteThemeTitle'),
      message: tGlobal('settings.themes.deleteThemeMessage', {
        name: resolveThemeDisplayName(theme.name),
      }),
      confirmText: tGlobal('common.delete'),
      cancelText: tGlobal('common.cancel'),
      variant: 'danger',
    })
    if (!ok) return

    const deletedSnapshot = snapshotTheme(theme)

    try {
      const res = await apiClient.delete(endpoints.themes.delete(theme.id))
      if (res.success) {
        showUndoableSuccess(tGlobal('settings.themes.themeDeleted'), {
          group: THEME_UNDO_GROUPS.delete,
          kind: 'theme.delete',
          undoAudit: themeUndoAudit('delete', deletedSnapshot.name || ''),
          onUndo: async () => {
            try {
              const createRes = await apiClient.post(endpoints.themes.create, {
                name: deletedSnapshot.name,
                description: deletedSnapshot.description,
                author: deletedSnapshot.author,
                base_theme: deletedSnapshot.base_theme,
                module_key: deletedSnapshot.module_key,
                module_pair: deletedSnapshot.module_pair,
                colors: deletedSnapshot.colors,
                bootstrap_colors: deletedSnapshot.bootstrap_colors,
                module_tokens: deletedSnapshot.module_tokens,
              })
              if (!createRes.success || !createRes.data?.id) {
                toast.error(tGlobal('settings.themes.undoError'))
                throw new Error('undo delete failed')
              }
              let restored = createRes.data
              if (deletedSnapshot.is_available && !restored.is_available) {
                const availRes = await apiClient.patch(endpoints.themes.update(restored.id), {
                  is_available: true,
                })
                if (availRes.success) {
                  restored = availRes.data
                }
              }
              await loadThemes()
              const fromList = themes.value.find((t) => t.id === restored.id) || restored
              selectTheme(fromList, { preview: false })
              toast.success(tGlobal('settings.themes.undoRestored'))
            } catch (e) {
              if (e?.message !== 'undo delete failed') {
                toast.error(tGlobal('settings.themes.undoError'))
              }
              throw e
            }
          },
        })
        await loadThemes()
      }
    } catch {
      toast.error(tGlobal('settings.themes.deleteError'))
    }
  }

  // Экспорт темы
  const exportTheme = async () => {
    if (!currentTheme.id || isDraftSelected.value) {
      // Экспорт несохраненной темы
      const data = {
        name: currentTheme.name,
        description: currentTheme.description,
        author: normalizeThemeAuthorForSave(currentTheme.author),
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
      toast.success(tGlobal('settings.themes.exported'))
      return
    }
  
    try {
      const res = await apiClient.downloadFile(endpoints.themes.export(currentTheme.id))
      if (!res.success || !res.data) {
        toast.error(res.message || tGlobal('settings.themes.exportError'))
        return
      }
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentTheme.name || 'theme'}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(tGlobal('settings.themes.exported'))
    } catch {
      toast.error(tGlobal('settings.themes.exportError'))
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
        toast.success(tGlobal('settings.themes.imported'))
        await loadThemes()
        selectTheme(res.data)
      } else {
        toast.error(res.message || tGlobal('settings.themes.importError'))
      }
    } catch (e) {
      toast.error(e.message || tGlobal('settings.themes.importThemeError'))
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
    toggleThemeAvailable,
    duplicateTheme,
    deleteTheme,
    exportTheme,
    importTheme,
    handleFileImport,
  }
}
