import { ref } from 'vue'

export const confirmDialog = ref({
  show: false,
  title: 'Подтверждение',
  message: '',
  confirmText: 'Удалить',
  cancelText: 'Отмена',
  variant: 'danger',
  loading: false,
  confirmCountdownSeconds: 0,
  zIndex: null,
  onConfirm: null,
  onCancel: null,
})

export const choiceDialog = ref({
  show: false,
  title: 'Выберите действие',
  message: '',
  choices: [],
  loading: false,
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
      title: options.title ?? 'Подтверждение',
      message: options.message ?? 'Вы уверены?',
      confirmText: options.confirmText ?? 'Подтвердить',
      cancelText: options.cancelText ?? 'Отмена',
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

export function confirmDelete(title = 'Удаление', message = 'Вы уверены, что хотите удалить?') {
  return confirmAction({
    title,
    message,
    confirmText: 'Удалить',
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
      title: options.title ?? 'Выберите действие',
      message: options.message ?? 'Выберите одно из действий:',
      choices: options.choices ?? [],
      loading: false,
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
