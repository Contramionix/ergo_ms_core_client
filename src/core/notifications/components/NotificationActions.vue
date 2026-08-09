<script setup>
import { ref } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import { executeNotificationAction } from '@/core/notifications/js/useNotificationsInbox.js'

const props = defineProps({
  notification: {
    type: Object,
    required: true,
  },
})

const { t } = useAppI18n()
const executingId = ref('')
const toast = useToast()

const STYLE_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-outline-secondary',
  danger: 'btn-outline-danger',
}

function btnClass(style) {
  return `btn btn-sm ${STYLE_CLASS[style] || STYLE_CLASS.secondary}`
}

function hasPendingActions(item) {
  return item?.actions_state === 'pending' && Array.isArray(item?.actions) && item.actions.length > 0
}

function resolvedLabel(item) {
  if (item?.actions_state !== 'resolved') return ''
  const action = (item.actions || []).find((a) => a.id === item.resolved_action_id)
  return action?.label
    ? t('settings.inbox.actionSelected', { label: action.label })
    : t('settings.inbox.actionDone')
}

async function runAction(actionId) {
  if (executingId.value) return
  executingId.value = actionId
  try {
    const result = await executeNotificationAction(props.notification.id, actionId)
    if (result?.success) {
      if (result.message) toast.success(result.message)
    } else if (result?.message) {
      toast.error(result.message)
    } else {
      toast.error(t('settings.inbox.actionFailed'))
    }
  } catch (e) {
    logError('executeNotificationAction:', e)
    toast.error(t('settings.inbox.actionFailed'))
  } finally {
    executingId.value = ''
  }
}
</script>

<template>
  <div v-if="hasPendingActions(notification)" class="notification-actions" @click.stop>
    <button v-for="action in notification.actions" :key="action.id" type="button" :class="btnClass(action.style)" :disabled="Boolean(executingId)" @click="runAction(action.id)">
      <span v-if="executingId === action.id" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"/>
      <span>{{ executingId === action.id ? t('common.loading') : action.label }}</span>
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