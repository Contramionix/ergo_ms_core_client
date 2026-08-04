import { tGlobal } from '@/i18n/index.js'

const THEME_UNDO_SOURCE = 'core.settings'

const LABEL_KEY_BY_KIND = {
  set_default: 'setDefault',
  availability: 'availability',
  duplicate: 'duplicate',
  delete: 'delete',
  reset_system: 'resetSystem',
  variant_reset: 'variantReset',
}

/**
 * Payload для showUndoableSuccess({ undoAudit }) — темы.
 * @param {string} kind
 * @param {string} [themeName]
 */
export function themeUndoAudit(kind, themeName = '') {
  const shortKind = String(kind || '').replace(/^theme\./, '')
  const labelKey = LABEL_KEY_BY_KIND[shortKind]
  const label = labelKey
    ? tGlobal(`settings.themes.undoKinds.${labelKey}`)
    : shortKind
  const entityLabel = themeName || label
  return {
    kind: `theme.${shortKind}`,
    label,
    entityLabel,
    entityType: 'theme',
    sourceModule: THEME_UNDO_SOURCE,
    meta: { theme_name: themeName || '' },
  }
}

/**
 * Человекочитаемая подпись kind (theme.set_default → «стандарт системы»).
 * @param {string} kindFull
 */
export function resolveThemeUndoKindLabel(kindFull) {
  const shortKind = String(kindFull || '').replace(/^theme\./, '')
  const labelKey = LABEL_KEY_BY_KIND[shortKind]
  if (labelKey) {
    return tGlobal(`settings.themes.undoKinds.${labelKey}`)
  }
  return shortKind || kindFull
}
