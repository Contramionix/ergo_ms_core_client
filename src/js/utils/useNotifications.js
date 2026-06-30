import {
  confirmDialog,
  choiceDialog,
  confirmAction,
  confirmDelete,
  confirmChoice,
  closeConfirmDialog,
  cancelConfirmDialog,
  closeChoiceDialog,
  cancelChoiceDialog,
  setConfirmLoading,
  setChoiceLoading,
  runWithConfirm,
} from '@/js/utils/confirm.js'

export function useNotifications() {
  return {
    confirmDialog,
    choiceDialog,
    showConfirmDialog: confirmAction,
    showChoiceDialog: confirmChoice,
    closeConfirmDialog,
    cancelConfirmDialog,
    closeChoiceDialog,
    cancelChoiceDialog,
    setConfirmLoading,
    setChoiceLoading,
  }
}

export {
  confirmDialog,
  choiceDialog,
  confirmAction,
  confirmDelete,
  confirmChoice,
  closeConfirmDialog,
  cancelConfirmDialog,
  closeChoiceDialog,
  cancelChoiceDialog,
  setConfirmLoading,
  setChoiceLoading,
  runWithConfirm,
}
