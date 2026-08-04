/** Запись отмены действия в журнал аудита (не блокирует UI). */

import { apiClient } from '@/js/api/manager'
import { auditEndpoints } from '@/core/audit/js/endpoints.js'
import { logError } from '@/js/utils/logError.js'

/**
 * @param {{
 *   kind: string,
 *   label: string,
 *   entityLabel?: string,
 *   entityType?: string,
 *   entityRef?: string,
 *   sourceModule?: string,
 *   meta?: Record<string, string|number|boolean|null>,
 * }} payload
 */
export function reportUndo(payload = {}) {
  const kind = String(payload.kind || '').trim()
  const label = String(payload.label || '').trim()
  if (!kind || !label) {
    return
  }

  const body = {
    kind,
    label,
    entity_label: String(payload.entityLabel || label).trim(),
    entity_type: String(payload.entityType || 'action').trim(),
    entity_ref: String(payload.entityRef || '').trim(),
    source_module: String(payload.sourceModule || 'core.cms.adp').trim(),
  }
  if (payload.meta && typeof payload.meta === 'object') {
    body.meta = payload.meta
  }

  apiClient.post(auditEndpoints.audit.recordUndo, body).catch((e) => {
    logError('reportUndo:', e)
  })
}
