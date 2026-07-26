/** Сброс системных тем к defaults. */

import { getThemeDefaultsManager, preloadModuleThemeManifests } from '@/modules/themes/ThemeDefaultsManager.js'

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
    if (theme.is_pair || theme.module_key) {
      await preloadModuleThemeManifests()
      const moduleKey = theme.module_key || selectedScope.value
      const manifest = await getThemeDefaultsManager().getByModuleKey(moduleKey)
      const resetId = ids[0]
      if (!resetId) {
        toast.error('Не удалось определить тему для сброса')
        return
      }
      const res = await apiClient.post(
        endpoints.themes.resetDefaults(resetId),
        manifest ? { manifest } : {},
      )
      if (!res.success) {
        toast.error(res.message || 'Ошибка сброса темы')
        return
      }
    } else {
      for (const id of ids) {
        const res = await apiClient.post(endpoints.themes.resetDefaults(id))
        if (!res.success) {
          toast.error(res.message || 'Ошибка сброса темы')
          return
        }
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
