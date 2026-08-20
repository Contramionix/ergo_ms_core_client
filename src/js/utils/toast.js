import ErgoToastBody from '@/components/ErgoToastBody.vue'
import { h } from 'vue'
import { toast as sonnerToast } from 'vue-sonner'
import {
  getToastSettingsSnapshot,
  getToastTimeouts,
  isToastEnabled,
} from '@/js/utils/toastSettings.js'
import { extractApiError } from '@/js/utils/apiErrorMessage.js'
import { shouldSuppressRateLimitToast } from '@/composables/useRateLimitNotice.js'
import { clientEnv } from '@/js/clientEnv.js'
import { tGlobal } from '@/i18n/index.js'
import { reportUndo } from '@/core/audit/js/reportUndo.js'
import { confirmAction } from '@/js/utils/confirm.js'
import {
  canBatchUndoKind,
  clearUndoEntries,
  countUndoEntries,
  deleteUndoGroup,
  getOldestUndoEntry,
  getUndoGroupState,
  patchUndoGroupState,
  pushUndoEntry,
  removeUndoEntry,
} from '@/js/utils/undoRegistry.js'

export const TOAST_TIMEOUT = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
  default: 3000,
}

export function normalizeToastMessage(message, fallback) {
  const resolvedFallback = fallback ?? tGlobal('components.toast.errorFallback')
  if (message == null || message === '') {
    return resolvedFallback
  }

  if (typeof message === 'string') {
    return message
  }

  if (typeof message === 'number' || typeof message === 'boolean') {
    return String(message)
  }

  if (Array.isArray(message)) {
    return message.map((item) => normalizeToastMessage(item, '')).filter(Boolean).join(', ') || resolvedFallback
  }

  if (typeof message === 'object') {
    if (typeof message.message === 'string') {
      return message.message
    }
    if (typeof message.detail === 'string') {
      return message.detail
    }
    if (typeof message.error === 'string') {
      return message.error
    }
  }

  return resolvedFallback
}

function mapToastType(type) {
  if (!type) {
    return 'info'
  }
  return type
}

const UNDOABLE_SUCCESS_TIMEOUT = 10000

function resolveToastAction(toast) {
  const action = toast?.action
  const secondaryAction = toast?.secondaryAction
  let actionLabel = ''
  let onAction = null
  let secondaryActionLabel = ''
  let onSecondaryAction = null

  if (action && typeof action === 'object') {
    actionLabel = typeof action.label === 'string' ? action.label.trim() : ''
    onAction = typeof action.onClick === 'function' ? action.onClick : null
    if (!actionLabel || !onAction) {
      actionLabel = ''
      onAction = null
    }
  }

  if (secondaryAction && typeof secondaryAction === 'object') {
    secondaryActionLabel = typeof secondaryAction.label === 'string'
      ? secondaryAction.label.trim()
      : ''
    onSecondaryAction = typeof secondaryAction.onClick === 'function'
      ? secondaryAction.onClick
      : null
    if (!secondaryActionLabel || !onSecondaryAction) {
      secondaryActionLabel = ''
      onSecondaryAction = null
    }
  }

  return { actionLabel, onAction, secondaryActionLabel, onSecondaryAction }
}

export function createToastFilterBeforeCreate() {
  return (toast) => toast
}

function toastDuration(timeout) {
  if (timeout === false || timeout === 0) {
    return Infinity
  }
  return timeout
}

function resolveToastId(type, message, options = {}) {
  if (options.id != null && options.id !== '') {
    return options.id
  }
  if (options.dedupe === false) {
    return undefined
  }
  return `ergo:${type}:${normalizeToastMessage(message)}`
}

function showTyped(type, message, options = {}) {
  if (!isToastEnabled()) {
    return undefined
  }
  const normalizedType = mapToastType(type)
  const {
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
  } = resolveToastAction(options)
  const snapshot = getToastSettingsSnapshot()
  const timeouts = getToastTimeouts()
  const duration = toastDuration(
    options.timeout ?? timeouts[normalizedType] ?? timeouts.default ?? TOAST_TIMEOUT.default,
  )
  const onClose = typeof options.onClose === 'function' ? options.onClose : null
  let closed = false
  const notifyClose = () => {
    if (closed || !onClose) {
      return
    }
    closed = true
    onClose()
  }
  const hideProgressBar = snapshot.hideProgressBar === true
  const pauseOnHover = snapshot.pauseOnHover !== false
  const shouldDedupe = options.dedupe ?? !actionLabel
  return sonnerToast.custom(
    (id) => h(ErgoToastBody, {
      message: normalizeToastMessage(message),
      type: normalizedType,
      duration: duration === Infinity ? 0 : duration,
      hideProgressBar,
      actionLabel,
      onAction,
      secondaryActionLabel,
      onSecondaryAction,
      onCloseToast: () => {
        sonnerToast.dismiss(id)
        notifyClose()
      },
    }),
    {
      id: resolveToastId(normalizedType, message, {
        id: options.id,
        dedupe: shouldDedupe,
      }),
      duration,
      unstyled: true,
      class: [
        'ergo-toast',
        `ergo-toast--${normalizedType}`,
        actionLabel || secondaryActionLabel ? 'ergo-toast--with-action' : null,
        pauseOnHover ? 'ergo-toast--pause-on-hover' : null,
      ].filter(Boolean).join(' '),
      onAutoClose: notifyClose,
      onDismiss: notifyClose,
    },
  )
}

export function getToastPluginOptions() {
  const snapshot = getToastSettingsSnapshot()
  const timeouts = getToastTimeouts(snapshot.durationPreset)
  return {
    position: snapshot.position,
    maxToasts: snapshot.maxToasts,
    timeout: timeouts.default,
  }
}

export function syncToastPluginWithSettings() {
  // Позиция и лимиты читает ErgoToaster из toastSettings.
}

function mergeOptions(type, options = {}) {
  const normalizedType = mapToastType(type)
  const timeouts = getToastTimeouts()
  return {
    type: normalizedType,
    timeout: timeouts[normalizedType] ?? timeouts.default ?? TOAST_TIMEOUT.default,
    ...options,
  }
}

function createToastApi() {
  const wrapped = (message, options = {}) => showTyped(options.type || 'info', message, options)
  wrapped.clear = () => sonnerToast.dismiss()
  wrapped.dismiss = (id) => sonnerToast.dismiss(id)
  wrapped.update = () => {}
  wrapped.updateDefaults = () => {}
  wrapped.success = (message, options = {}) => showTyped('success', message, mergeOptions('success', options))
  wrapped.error = (message, options = {}) => showTyped('error', message, mergeOptions('error', options))
  wrapped.warning = (message, options = {}) => showTyped('warning', message, mergeOptions('warning', options))
  wrapped.info = (message, options = {}) => showTyped('info', message, mergeOptions('info', options))
  return wrapped
}

let globalToastInstance

export function getToast() {
  if (!globalToastInstance) {
    globalToastInstance = createToastApi()
  }
  return globalToastInstance
}

export function useToast() {
  return getToast()
}

export function showSuccess(message, duration) {
  const timeouts = getToastTimeouts()
  return getToast().success(message, { timeout: duration ?? timeouts.success })
}

export function showError(message, duration) {
  const timeouts = getToastTimeouts()
  return getToast().error(message, { timeout: duration ?? timeouts.error })
}

export function showWarning(message, duration) {
  const timeouts = getToastTimeouts()
  return getToast().warning(message, { timeout: duration ?? timeouts.warning })
}

export function showInfo(message, duration) {
  const timeouts = getToastTimeouts()
  return getToast().info(message, { timeout: duration ?? timeouts.info })
}

export function showToast(message, type = 'info', duration) {
  if (!isToastEnabled()) {
    return undefined
  }

  const normalizedType = mapToastType(type)
  const timeouts = getToastTimeouts()
  const timeout = duration ?? timeouts[normalizedType] ?? timeouts.default ?? TOAST_TIMEOUT.default
  const toast = getToast()

  if (typeof toast[normalizedType] === 'function') {
    return toast[normalizedType](message, { timeout })
  }

  return toast(message, mergeOptions(normalizedType, { timeout }))
}

export async function handleApiError(error, defaultMessage) {
  const status = error?.response?.status
  if (status === 429) {
    if (shouldSuppressRateLimitToast()) {
      return
    }
    showError(tGlobal('errors.api.tooManyRequests'))
    return
  }
  if (status === 413) {
    showError(tGlobal('errors.api.payloadTooLarge'))
    return
  }
  const fallback = defaultMessage ?? tGlobal('components.toast.errorFallback')
  showError(extractApiError(error, fallback))
}

export function showValidationError(message) {
  showWarning(message ?? tGlobal('components.toast.validationError'))
}

export function showSaveSuccess(itemType) {
  const item = itemType ?? tGlobal('components.toast.defaultItem')
  showSuccess(tGlobal('components.toast.saveSuccess', { item }))
}

export function showDeleteSuccess(itemType) {
  const item = itemType ?? tGlobal('components.toast.defaultDeleteItem')
  showSuccess(tGlobal('components.toast.deleteSuccess', { item }))
}

function reportUndoAudit(undoAudit, extraMeta = null) {
  if (!undoAudit || typeof undoAudit !== 'object') {
    return
  }
  const payload = { ...undoAudit }
  if (extraMeta && typeof extraMeta === 'object') {
    payload.meta = { ...(payload.meta || {}), ...extraMeta }
  }
  reportUndo(payload)
}

function dismissUndoGroupToast(group) {
  patchUndoGroupState(group, (state) => {
    if (state.visibleToastId == null) {
      return
    }
    state.suppressExpireForToastId = state.visibleToastId
    getToast().dismiss(state.visibleToastId)
    state.visibleToastId = null
  })
}

async function runBatchUndoKind(group, kind) {
  const count = countUndoEntries(group, kind)
  if (count <= 1) {
    return
  }

  const ok = await confirmAction({
    title: tGlobal('common.undoAllConfirmTitle'),
    message: tGlobal('common.undoAllConfirmMessage', { count }),
    confirmText: tGlobal('common.undo'),
    cancelText: tGlobal('common.cancel'),
    variant: 'warning',
  })
  if (!ok) {
    return
  }

  const state = getUndoGroupState(group)
  const batchFn = state?.batchUndoByKind?.[kind]
    || getOldestUndoEntry(group, kind)?.batchUndo
  const oldest = getOldestUndoEntry(group, kind)
  const auditTemplate = oldest?.undoAudit

  dismissUndoGroupToast(group)
  try {
    if (typeof batchFn === 'function') {
      await batchFn(oldest)
    } else if (oldest) {
      await oldest.onUndo()
    }
    reportUndoAudit(auditTemplate, { bulk: true, count })
    clearUndoEntries(group, kind)
    const onEmpty = getUndoGroupState(group)?.onStackEmpty
    if (!getUndoGroupState(group)?.entries?.length) {
      deleteUndoGroup(group)
      onEmpty?.()
    } else {
      revealUndoStackTop(group, { refreshTimeout: true })
    }
  } catch (e) {
    revealUndoStackTop(group, { refreshTimeout: true })
    throw e
  }
}

function revealUndoStackTop(group, { refreshTimeout = false } = {}) {
  const state = getUndoGroupState(group)
  if (!state?.entries.length) {
    deleteUndoGroup(group)
    return undefined
  }

  const top = state.entries[state.entries.length - 1]
  const kind = top.kind || 'default'
  const pendingCount = countUndoEntries(group, kind)
  const showBatch = pendingCount > 1 && canBatchUndoKind(group, kind)
  const lifetime = state.lifetimeMs || UNDOABLE_SUCCESS_TIMEOUT
  const timeout = refreshTimeout ? lifetime : (top.timeoutMs || lifetime)

  let closedByUndo = false
  let toastId
  toastId = getToast().success(top.message, {
    timeout,
    onClose: () => {
      const state = getUndoGroupState(group)
      if (!state) {
        return
      }
      if (state.visibleToastId === toastId) {
        patchUndoGroupState(group, (current) => {
          current.visibleToastId = null
        })
      }
      if (state.suppressExpireForToastId === toastId) {
        patchUndoGroupState(group, (current) => {
          current.suppressExpireForToastId = null
        })
        return
      }
      if (closedByUndo) {
        return
      }
      // Таймаут / закрытие toast без отмены — сбрасываем весь стек группы.
      deleteUndoGroup(group)
    },
    action: {
      label: top.undoLabel || tGlobal('common.undo'),
      onClick: async () => {
        if (closedByUndo) {
          return
        }
        closedByUndo = true
        try {
          await top.onUndo()
          reportUndoAudit(top.undoAudit)
        } catch (e) {
          closedByUndo = false
          throw e
        }
        removeUndoEntry(group, top.id)
        patchUndoGroupState(group, (current) => {
          current.visibleToastId = null
        })
        const onEmpty = getUndoGroupState(group)?.onStackEmpty
        const nextId = revealUndoStackTop(group, { refreshTimeout: true })
        if (nextId == null) {
          onEmpty?.()
        }
      },
    },
    secondaryAction: showBatch
      ? {
          label: tGlobal('common.undoAll', { count: pendingCount }),
          onClick: async () => {
            if (closedByUndo) {
              return
            }
            closedByUndo = true
            try {
              await runBatchUndoKind(group, kind)
            } catch (e) {
              closedByUndo = false
              throw e
            }
          },
        }
      : undefined,
  })

  patchUndoGroupState(group, (current) => {
    current.visibleToastId = toastId
  })
  return toastId
}

function pushUndoableStack(group, entry, stackMax, onStackEmpty) {
  dismissUndoGroupToast(group)

  pushUndoEntry(
    group,
    {
      kind: entry.kind || 'default',
      message: entry.message,
      onUndo: entry.onUndo,
      undoAudit: entry.undoAudit,
      undoLabel: entry.undoLabel,
      timeoutMs: entry.timeout,
      batchUndo: entry.batchUndo,
      onStackEmpty,
      batchContext: entry.batchContext,
    },
    { stackMax },
  )

  patchUndoGroupState(group, (state) => {
    if (typeof onStackEmpty === 'function') {
      state.onStackEmpty = onStackEmpty
    }
    state.lifetimeMs = entry.timeout ?? state.lifetimeMs ?? UNDOABLE_SUCCESS_TIMEOUT
  })

  return revealUndoStackTop(group, { refreshTimeout: false })
}

/**
 * Success-toast с одноразовой кнопкой отката.
 * @param {string} message
 * @param {{
 *   onUndo: Function,
 *   undoLabel?: string,
 *   timeout?: number,
 *   group?: string,
 *   kind?: string,
 *   stackMax?: number,
 *   batchUndo?: Function,
 *   batchContext?: object,
 *   onStackEmpty?: Function,
 *   undoAudit?: object,
 * }} options
 * `stackMax` + `group` — стек отмен; при `batchUndo` и count>1 — «Отменить все (N)».
 */
export function showUndoableSuccess(message, options = {}) {
  const {
    onUndo,
    undoLabel,
    timeout,
    group,
    kind,
    stackMax,
    batchUndo,
    batchContext,
    onStackEmpty,
    undoAudit,
  } = options
  if (typeof onUndo !== 'function' || !clientEnv.toastUndoEnabled) {
    return showSuccess(message, timeout)
  }

  if (group) {
    const effectiveStackMax = stackMax > 0 ? stackMax : 1
    return pushUndoableStack(
      group,
      {
        message,
        onUndo,
        undoLabel,
        timeout,
        undoAudit,
        kind: kind || undoAudit?.kind || 'default',
        batchUndo,
        batchContext,
      },
      effectiveStackMax,
      onStackEmpty,
    )
  }

  let undone = false
  let toastId
  toastId = getToast().success(message, {
    timeout: timeout ?? UNDOABLE_SUCCESS_TIMEOUT,
    action: {
      label: undoLabel || tGlobal('common.undo'),
      onClick: async () => {
        if (undone) {
          return
        }
        undone = true
        try {
          await onUndo()
          reportUndoAudit(undoAudit)
        } catch (e) {
          undone = false
          throw e
        }
        onStackEmpty?.()
      },
    },
  })
  return toastId
}
