/** Сброс системных тем к defaults. */

import { getThemeDefaultsManager, preloadModuleThemeManifests } from '@/modules/themes/ThemeDefaultsManager.js'
import { tGlobal } from '@/i18n/index.js'
import { showUndoableSuccess } from '@/js/utils/toast.js'
import { themeUndoAudit } from './themeUndoAudit.js'
import { THEME_UNDO_GROUPS } from './themeUndoGroups.js'
import { resolveThemeDisplayName } from './resolveSystemThemeLabel.js'

function snapshotThemeForUndo(source) {
  if (!source?.id) {
    return null
  }
  return {
    id: source.id,
    name: source.name,
    description: source.description || '',
    author: source.author || '',
    base_theme: source.base_theme,
    module_key: source.module_key || null,
    module_pair: source.module_pair || 'default',
    colors: { ...(source.colors || {}) },
    bootstrap_colors: { ...(source.bootstrap_colors || {}) },
    module_tokens: { ...(source.module_tokens || {}) },
  }
}

function collectUndoSnapshots(theme) {
  if (theme.is_pair) {
    return ['light', 'dark']
      .map((key) => snapshotThemeForUndo(theme.variants?.[key]))
      .filter(Boolean)
  }
  const single = snapshotThemeForUndo(theme)
  return single ? [single] : []
}

export async function resetSystemThemeRecord(theme, ctx) {
  const {
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
  } = ctx

  if (!theme.is_system && !theme.is_pair) {
    return
  }

  const ok = await confirmAction({
    title: tGlobal('settings.themes.resetTitle'),
    message: tGlobal('settings.themes.resetMessage', {
      name: resolveThemeDisplayName(theme.name),
    }),
    confirmText: tGlobal('settings.themes.resetConfirm'),
    cancelText: tGlobal('common.cancel'),
    variant: 'warning',
  })
  if (!ok) {
    return
  }

  const ids = theme.is_pair
    ? [theme.variants?.light?.id, theme.variants?.dark?.id].filter(Boolean)
    : [theme.id]
  const undoSnapshots = collectUndoSnapshots(theme)
  const pairKey = theme.module_pair
  const themeId = theme.id

  resettingThemeId.value = theme.id || theme.module_pair
  try {
    if (theme.is_pair || theme.module_key) {
      await preloadModuleThemeManifests()
      const moduleKey = theme.module_key || selectedScope.value
      const manifest = await getThemeDefaultsManager().getByModuleKey(moduleKey)
      const resetId = ids[0]
      if (!resetId) {
        toast.error(tGlobal('settings.themes.resetThemeMissing'))
        return
      }
      const res = await apiClient.post(
        endpoints.themes.resetDefaults(resetId),
        manifest ? { manifest } : {},
      )
      if (!res.success) {
        toast.error(res.message || tGlobal('settings.themes.resetThemeError'))
        return
      }
    } else {
      for (const id of ids) {
        const res = await apiClient.post(endpoints.themes.resetDefaults(id))
        if (!res.success) {
          toast.error(res.message || tGlobal('settings.themes.resetThemeError'))
          return
        }
      }
    }

    const successMessage = tGlobal('settings.themes.resetThemeSuccess', {
      name: resolveThemeDisplayName(theme.name),
    })

    if (undoSnapshots.length) {
      showUndoableSuccess(successMessage, {
        group: THEME_UNDO_GROUPS.reset,
        kind: 'theme.reset_system',
        undoAudit: themeUndoAudit(
          'reset_system',
          resolveThemeDisplayName(theme.name),
        ),
        onUndo: async () => {
          try {
            for (const snapshot of undoSnapshots) {
              const undoRes = await apiClient.put(endpoints.themes.update(snapshot.id), {
                name: snapshot.name,
                description: snapshot.description,
                author: snapshot.author,
                base_theme: snapshot.base_theme,
                module_key: snapshot.module_key,
                module_pair: snapshot.module_pair,
                colors: snapshot.colors,
                bootstrap_colors: snapshot.bootstrap_colors,
                module_tokens: snapshot.module_tokens,
              })
              if (!undoRes.success) {
                toast.error(tGlobal('settings.themes.undoError'))
                throw new Error('undo reset failed')
              }
            }
            await loadThemes()
            if (pairKey && theme.is_pair) {
              const refreshed = themes.value.find((p) => p.module_pair === pairKey)
              if (refreshed) {
                selectModulePair(refreshed, editingVariant.value, { preview: false })
                if (refreshed.is_active) {
                  applyActivatedTheme(refreshed)
                }
              }
            } else if (themeId) {
              const restored = themes.value.find((t) => t.id === themeId)
              if (restored) {
                selectTheme(restored)
                if (restored.is_active) {
                  applyActivatedTheme(restored)
                }
              }
            }
            toast.success(tGlobal('settings.themes.undoRestored'))
          } catch (e) {
            if (e?.message !== 'undo reset failed') {
              toast.error(tGlobal('settings.themes.undoError'))
            }
            throw e
          }
        },
      })
    } else {
      toast.success(successMessage)
    }

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
    toast.error(tGlobal('settings.themes.resetThemeError'))
  } finally {
    resettingThemeId.value = null
  }
}
