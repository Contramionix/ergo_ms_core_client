<script setup>
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps({
  message: { type: String, required: true },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info', 'default'].includes(value),
  },
})

const emit = defineEmits(['close-toast'])

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Info,
}

const IconComponent = computed(() => iconMap[props.type] || iconMap.info)

function close() {
  emit('close-toast')
}
</script>

<template>
  <div class="ergo-toast-body" :class="`ergo-toast-body--${type}`">
    <IconComponent :size="20" class="ergo-toast-body__icon" aria-hidden="true" />
    <span class="ergo-toast-body__message">{{ message }}</span>
    <button
      type="button"
      class="ergo-toast-body__close"
      aria-label="Закрыть"
      @click="close"
    >
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
.ergo-toast-body {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  color: var(--ui-text);
}

.ergo-toast-body__icon {
  flex-shrink: 0;
}

.ergo-toast-body--success .ergo-toast-body__icon {
  color: var(--bs-success);
}

.ergo-toast-body--error .ergo-toast-body__icon {
  color: var(--bs-danger);
}

.ergo-toast-body--warning .ergo-toast-body__icon {
  color: var(--bs-warning);
}

.ergo-toast-body--info .ergo-toast-body__icon,
.ergo-toast-body--default .ergo-toast-body__icon {
  color: var(--bs-info);
}

.ergo-toast-body__message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.ergo-toast-body__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 4px;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.ergo-toast-body__close:hover {
  opacity: 1;
}
</style>
