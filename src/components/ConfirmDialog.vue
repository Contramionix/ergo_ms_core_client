<script setup>
import { AlertTriangle } from 'lucide-vue-next'
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Подтверждение' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Удалить' },
  cancelText: { type: String, default: 'Отмена' },
  variant: { type: String, default: 'danger', validator: (value) => ['danger', 'warning', 'primary'].includes(value) },
  loading: { type: Boolean, default: false },
  confirmCountdownSeconds: { type: Number, default: 0 }
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

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

const disableBodyScroll = () => { 
  document.body.style.overflow = 'hidden' 
}

const enableBodyScroll = () => { 
  document.body.style.overflow = '' 
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    disableBodyScroll()
    startCountdown()
  } else {
    enableBodyScroll()
    clearCountdown()
  }
})

onUnmounted(() => {
  enableBodyScroll()
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
  <div  v-if="show && message" class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5); z-index: 9999;">
    <div class="modal-dialog modal-dialog-centered" style="z-index: 10000;">
      <div class="modal-content">
        <div class="modal-header border-0 pb-0">
          <div class="d-flex align-items-center gap-2">
            <AlertTriangle v-if="variant === 'danger' || variant === 'warning'"  :size="24"  :class="variant === 'danger' ? 'text-danger' : 'text-warning'" />
            <h5 class="modal-title mb-0">{{ title }}</h5>
          </div>
          <button type="button" class="btn-close" @click="handleClose" :disabled="loading"></button>
        </div>
        
        <div class="modal-body pt-2">
          <p class="mb-0" style="white-space: pre-line;">{{ message }}</p>
        </div>
        
        <div class="modal-footer border-0 pt-2">
          <button type="button" class="btn btn-secondary" @click="handleCancel" :disabled="loading">
            {{ cancelText }}
          </button>
          <button type="button" :class="`btn btn-${variant === 'primary' ? 'primary' : 'danger'}`" @click="handleConfirm" :disabled="isConfirmDisabled">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            {{ confirmButtonText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 9999 !important;
}

.modal-dialog {
  z-index: 10000 !important;
  position: relative !important;
}

.modal-content {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 10001 !important;
  position: relative !important;
}

.modal-header, .modal-footer {
  padding: 1.5rem;
}

.modal-body {
  padding: 0 1.5rem 1rem;
  color: #6c757d;
}

.btn {
  border-radius: 8px;
  font-weight: 500;
}

.btn-close:focus {
  box-shadow: none;
}
</style> 