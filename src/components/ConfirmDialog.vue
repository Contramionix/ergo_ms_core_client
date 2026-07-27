<script setup>
import { AlertTriangle } from 'lucide-vue-next'
import { ref, computed, watch, onUnmounted } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Подтверждение' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Удалить' },
  cancelText: { type: String, default: 'Отмена' },
  variant: { type: String, default: 'danger', validator: (value) => ['danger', 'warning', 'primary'].includes(value) },
  loading: { type: Boolean, default: false },
  confirmCountdownSeconds: { type: Number, default: 0 },
  zIndex: { type: [Number, String], default: null },
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

const isVisible = computed(() => props.show && !!props.message)

const countdown = ref(0)
let countdownTimer = null

const confirmButtonText = computed(() => {
  if (countdown.value > 0) {
    return `${props.confirmText} (${countdown.value})`
  }
  return props.confirmText
})

const isConfirmDisabled = computed(() => props.loading || countdown.value > 0)

const clearCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdown.value = 0
}

const startCountdown = () => {
  clearCountdown()
  if (props.confirmCountdownSeconds <= 0) return

  countdown.value = props.confirmCountdownSeconds
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value -= 1
    } else {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    startCountdown()
  } else {
    clearCountdown()
  }
})

onUnmounted(() => {
  clearCountdown()
})

function handleConfirm() {
  if (!isConfirmDisabled.value) {
    emit('confirm')
  }
}

function handleCancel() {
  if (!props.loading) {
    emit('cancel')
    emit('close')
  }
}

function handleClose() {
  if (!props.loading) {
    emit('close')
  }
}
</script>

<template>
  <ModalCenter
    standalone
    modal-id="confirmDialog"
    :visible="isVisible"
    :z-index="zIndex"
    :close-on-backdrop="false"
    :close-on-esc="false"
    custom-class="confirm-dialog"
    @close="handleClose"
  >
    <template #title>
      <AlertTriangle v-if="variant === 'danger' || variant === 'warning'" :size="24" :class="variant === 'danger' ? 'text-danger' : 'text-warning'" />
      <span>{{ title }}</span>
    </template>

    <p class="mb-0 cd-message">{{ message }}</p>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" @click="handleCancel" :disabled="loading">
        {{ cancelText }}
      </button>
      <button
        type="button"
        :class="`ui-btn ui-btn--${variant === 'primary' ? 'primary' : 'danger'}`"
        @click="handleConfirm"
        :disabled="isConfirmDisabled"
      >
        <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-label="Загрузка"></span>
        {{ confirmButtonText }}
      </button>
    </template>
  </ModalCenter>
</template>

<style scoped>
.cd-message {
  white-space: pre-line;
  color: var(--color-secondary-text);
}
</style>
