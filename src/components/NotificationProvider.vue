<script setup>
import { confirmDialog, choiceDialog, closeConfirmDialog, cancelConfirmDialog, closeChoiceDialog, cancelChoiceDialog } from '@/js/utils/confirm.js'
import ConfirmDialog from './ConfirmDialog.vue'
import ChoiceDialog from './ChoiceDialog.vue'
</script>

<template>
  <ConfirmDialog
    :show="confirmDialog.show"
    :title="confirmDialog.title"
    :message="confirmDialog.message"
    :confirm-text="confirmDialog.confirmText"
    :cancel-text="confirmDialog.cancelText"
    :variant="confirmDialog.variant"
    :loading="confirmDialog.loading"
    :confirm-countdown-seconds="confirmDialog.confirmCountdownSeconds"
    :z-index="confirmDialog.zIndex"
    @confirm="confirmDialog.onConfirm"
    @cancel="confirmDialog.onCancel"
    @close="cancelConfirmDialog"
  />

  <ChoiceDialog
    :show="choiceDialog.show"
    :title="choiceDialog.title"
    :message="choiceDialog.message"
    :choices="choiceDialog.choices"
    :loading="choiceDialog.loading"
    :z-index="choiceDialog.zIndex"
    @choice="choiceDialog.onChoice"
    @cancel="choiceDialog.onCancel"
    @close="cancelChoiceDialog"
  />
</template>
