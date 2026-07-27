import { ref } from 'vue'
import { tGlobal } from '@/i18n/index.js'

export const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  confirmText: '',
  cancelText: '',
  variant: 'danger',
  loading: false,
  confirmCountdownSeconds: 0,
  zIndex: null,
  onConfirm: null,
  onCancel: null,
})

export const choiceDialog = ref({
  show: false,
  title: '',
  message: '',
  choices: [],
  loading: false,
  zIndex: null,
  onChoice: null,
  onCancel: null,
})

let confirmResolver = null
let choiceResolver = null

function settleConfirm(result) {
  const resolve = confirmResolver
  confirmResolver = null
  resolve?.(result)
}

function settleChoice(result) {
  const resolve = choiceResolver
  choiceResolver = null
  resolve?.(result)
}

function bindConfirmHandlers() {
  confirmDialog.value.onConfirm = () => {
    if (confirmDialog.value.loading) {
      return
    }
    settleConfirm(true)
    closeConfirmDialog()
  }

  confirmDialog.value.onCancel = () => {
    cancelConfirmDialog()
  }
}

export function closeConfirmDialog() {
  confirmDialog.value.show = false
  confirmDialog.value.loading = false
}

export function cancelConfirmDialog() {
  if (confirmDialog.value.loading) {
    return
  }
  settleConfirm(false)
  closeConfirmDialog()
}

export function setConfirmLoading(loading) {
  confirmDialog.value.loading = loading
}

export function confirmAction(options = {}) {
  return new Promise((resolve) => {
    if (confirmDialog.value.show) {
      resolve(false)
      return
    }

    confirmResolver = resolve
    confirmDialog.value = {
      show: true,
      title: options.title ?? tGlobal('components.confirm.title'),
      message: options.message ?? tGlobal('components.confirm.message'),
      confirmText: options.confirmText ?? tGlobal('components.confirm.confirm'),
      cancelText: options.cancelText ?? tGlobal('components.confirm.cancel'),
      variant: options.variant ?? 'danger',
      loading: false,
      confirmCountdownSeconds: options.confirmCountdownSeconds ?? 0,
      zIndex: options.zIndex ?? null,
      onConfirm: null,
      onCancel: null,
    }
    bindConfirmHandlers()
  })
}

export function confirmDelete(
  title = tGlobal('components.confirm.deleteTitle'),
  message = tGlobal('components.confirm.deleteMessage'),
) {
  return confirmAction({
    title,
    message,
    confirmText: tGlobal('components.confirm.deleteConfirm'),
    variant: 'danger',
  })
}

export function closeChoiceDialog() {
  choiceDialog.value.show = false
  choiceDialog.value.loading = false
}

export function cancelChoiceDialog() {
  if (choiceDialog.value.loading) {
    return
  }
  settleChoice(null)
  closeChoiceDialog()
}

export function setChoiceLoading(loading) {
  choiceDialog.value.loading = loading
}

export function confirmChoice(options = {}) {
  return new Promise((resolve) => {
    if (choiceDialog.value.show) {
      resolve(null)
      return
    }

    choiceResolver = resolve
    choiceDialog.value = {
      show: true,
      title: options.title ?? tGlobal('components.confirm.choiceTitle'),
      message: options.message ?? tGlobal('components.confirm.choiceMessage'),
      choices: options.choices ?? [],
      loading: false,
      zIndex: options.zIndex ?? null,
      onChoice: (value) => {
        if (choiceDialog.value.loading) {
          return
        }
        settleChoice(value)
        closeChoiceDialog()
      },
      onCancel: () => {
        cancelChoiceDialog()
      },
    }
  })
}

export async function runWithConfirm(options, action) {
  const confirmed = await confirmAction(options)
  if (!confirmed) {
    return false
  }

  setConfirmLoading(true)
  try {
    await action()
    return true
  } finally {
    closeConfirmDialog()
  }
}
