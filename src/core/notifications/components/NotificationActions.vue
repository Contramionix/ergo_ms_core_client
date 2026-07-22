<script setup>
import { ref } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import { executeNotificationAction } from '@/core/notifications/js/useNotificationsInbox.js'

const props = defineProps({
  notification: {
    type: Object,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['executed'])

const executingId = ref('')
const toast = useToast()

const STYLE_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-outline-secondary',
  danger: 'btn-outline-danger',
}

function btnClass(style) {
  const base = props.compact ? 'btn btn-sm' : 'btn btn-sm'
  return `${base} ${STYLE_CLASS[style] || STYLE_CLASS.secondary}`
}

function hasPendingActions(item) {
  return item?.actions_state === 'pending' && Array.isArray(item?.actions) && item.actions.length > 0
}

function resolvedLabel(item) {
  if (item?.actions_state !== 'resolved') return ''
  const action = (item.actions || []).find((a) => a.id === item.resolved_action_id)
  return action?.label ? `Выбрано: ${action.label}` : 'Действие выполнено'
}

async function runAction(actionId) {
  if (executingId.value) return
  executingId.value = actionId
  try {
    const result = await executeNotificationAction(props.notification.id, actionId)
    if (result?.success) {
      if (result.message) toast.success(result.message)
      emit('executed', result.notification)
    } else if (result?.message) {
      toast.error(result.message)
    } else {
      toast.error('Не удалось выполнить действие')
    }
  } catch (e) {
    logError('executeNotificationAction:', e)
    toast.error('Не удалось выполнить действие')
  } finally {
    executingId.value = ''
  }
}
</script>

<template>
  <div v-if="hasPendingActions(notification)" class="notification-actions" @click.stop>
    <button
      v-for="action in notification.actions"
      :key="action.id"
      type="button"
      :class="btnClass(action.style)"
      :disabled="Boolean(executingId)"
      @click="runAction(action.id)"
    >
      <span v-if="executingId === action.id" class="spinner-border spinner-border-sm" role="status" />
      <span v-else>{{ action.label }}</span>
    </button>
  </div>
  <div v-else-if="notification.actions_state === 'resolved'" class="notification-actions__resolved text-muted small">
    {{ resolvedLabel(notification) }}
  </div>
</template>

<style scoped lang="scss">
.notification-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.notification-actions__resolved {
  margin-top: 0.35rem;
}
</style>
