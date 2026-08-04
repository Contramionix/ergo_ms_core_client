<script setup>
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { tGlobal } from '@/i18n/index.js'
import { logError } from '@/js/utils/logError.js'

const props = defineProps({
  message: { type: String, required: true },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info', 'default'].includes(value),
  },
  actionLabel: {
    type: String,
    default: '',
  },
  onAction: {
    type: Function,
    default: null,
  },
  secondaryActionLabel: {
    type: String,
    default: '',
  },
  onSecondaryAction: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['close-toast'])

const actionBusy = ref(false)

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Info,
}

const IconComponent = computed(() => iconMap[props.type] || iconMap.info)

// Toast рендерится в отдельном app vue-toastification — useI18n/inject там ненадёжен.
const closeLabel = computed(() => tGlobal('common.close'))

const hasAction = computed(
  () => Boolean(props.actionLabel) && typeof props.onAction === 'function',
)

const hasSecondaryAction = computed(
  () => Boolean(props.secondaryActionLabel) && typeof props.onSecondaryAction === 'function',
)

const hasAnyAction = computed(() => hasAction.value || hasSecondaryAction.value)

const iconColorVar = computed(() => {
  switch (props.type) {
    case 'success':
      return 'var(--bs-success)'
    case 'error':
      return 'var(--bs-danger)'
    case 'warning':
      return 'var(--bs-warning)'
    default:
      return 'var(--bs-info)'
  }
})

function close() {
  emit('close-toast')
}

async function runAction() {
  if (!hasAction.value || actionBusy.value) {
    return
  }
  actionBusy.value = true
  try {
    const pending = props.onAction()
    close()
    await pending
  } catch (e) {
    logError('ErgoToastBody action:', e)
  } finally {
    actionBusy.value = false
  }
}

async function runSecondaryAction() {
  if (!hasSecondaryAction.value || actionBusy.value) {
    return
  }
  actionBusy.value = true
  try {
    const pending = props.onSecondaryAction()
    close()
    await pending
  } catch (e) {
    logError('ErgoToastBody secondaryAction:', e)
  } finally {
    actionBusy.value = false
  }
}
</script>

<template>
  <div
    class="ergo-toast-body"
    :class="[
      `ergo-toast-body--${type}`,
      { 'ergo-toast-body--with-action': hasAnyAction },
    ]"
  >
    <span class="ergo-toast-body__icon-wrap" aria-hidden="true">
      <IconComponent :size="20" :color="iconColorVar" class="ergo-toast-body__icon" />
    </span>
    <div class="ergo-toast-body__content">
      <span class="ergo-toast-body__message">{{ message }}</span>
      <div v-if="hasAnyAction" class="ergo-toast-body__actions">
        <button
          v-if="hasAction"
          type="button"
          class="ergo-toast-body__action"
          :disabled="actionBusy"
          @click.stop="runAction"
        >
          <span
            v-if="actionBusy"
            class="spinner-border spinner-border-sm me-1"
            role="status"
            aria-hidden="true"
          />
          {{ actionBusy ? tGlobal('common.loading') : actionLabel }}
        </button>
        <button
          v-if="hasSecondaryAction"
          type="button"
          class="ergo-toast-body__action ergo-toast-body__action--secondary"
          :disabled="actionBusy"
          @click.stop="runSecondaryAction"
        >
          {{ secondaryActionLabel }}
        </button>
      </div>
    </div>
    <button
      type="button"
      class="ergo-toast-body__close"
      :aria-label="closeLabel"
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

.ergo-toast-body--with-action {
  align-items: flex-start;
}

.ergo-toast-body__icon-wrap {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.375rem;
}

.ergo-toast-body--with-action .ergo-toast-body__icon-wrap {
  margin-top: 0.1rem;
}

.ergo-toast-body__icon {
  flex-shrink: 0;
  color: inherit;
}

.ergo-toast-body--success .ergo-toast-body__icon-wrap {
  color: var(--bs-success);
  background: color-mix(in srgb, var(--bs-success) 12%, transparent);
}

.ergo-toast-body--error .ergo-toast-body__icon-wrap {
  color: var(--bs-danger);
  background: color-mix(in srgb, var(--bs-danger) 12%, transparent);
}

.ergo-toast-body--warning .ergo-toast-body__icon-wrap {
  color: var(--bs-warning);
  background: color-mix(in srgb, var(--bs-warning) 12%, transparent);
}

.ergo-toast-body--info .ergo-toast-body__icon-wrap,
.ergo-toast-body--default .ergo-toast-body__icon-wrap {
  color: var(--bs-info);
  background: color-mix(in srgb, var(--bs-info) 12%, transparent);
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

.ergo-toast-body__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.ergo-toast-body__message {
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.ergo-toast-body__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.ergo-toast-body__action {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ui-accent, var(--bs-primary));
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  text-decoration: none;
}

.ergo-toast-body__action:hover:not(:disabled) {
  text-decoration: underline;
}

.ergo-toast-body__action--secondary {
  font-weight: 500;
  opacity: 0.9;
}

.ergo-toast-body__action:disabled {
  opacity: 0.7;
  cursor: wait;
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

.ergo-toast-body--with-action .ergo-toast-body__close {
  margin-top: 0.1rem;
}

.ergo-toast-body__close:hover {
  opacity: 1;
}
</style>
