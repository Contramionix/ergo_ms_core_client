<script setup>
import ModalCenter from '@/components/ModalCenter.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import { formatDateTime } from '@/js/utils/timeUtils.js'

defineProps({
  visible: { type: Boolean, default: false },
  event: { type: Object, default: null },
})

defineEmits(['close'])

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function ipLocationTooltip(event) {
  const ip = (event?.ip_address || '').trim()
  if (!ip) return ''
  const location = (event?.ip_location || '').trim()
  return location || 'Местоположение неизвестно'
}
</script>

<template>
  <ModalCenter
    standalone
    modal-id="auditEventDetails"
    :title="event?.action_label || 'Подробности события'"
    :visible="visible"
    size="lg"
    @close="$emit('close')"
  >
    <template v-if="event">
      <div class="audit-detail-meta">
        <div><span class="text-muted">Время:</span> {{ formatDateTime(event.created_at) }}</div>
        <div><span class="text-muted">Инициатор:</span> {{ event.actor_label || '—' }}</div>
        <div v-if="event.entity_label">
          <span class="text-muted">Объект:</span> {{ event.entity_label }}
        </div>
        <div v-if="event.ip_address" class="audit-detail-meta__ip">
          <span class="text-muted">IP:</span>
          <HoverTooltip :text="ipLocationTooltip(event)" wrap>
            <span class="audit-detail-ip">{{ event.ip_address }}</span>
          </HoverTooltip>
        </div>
      </div>

      <div v-if="event.changes?.length" class="audit-changes">
        <h6 class="audit-detail-heading">Изменения</h6>
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0 audit-changes__table">
            <thead>
              <tr>
                <th>Поле</th>
                <th>Было</th>
                <th>Стало</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(change, idx) in event.changes" :key="idx">
                <td>{{ change.label || change.field }}</td>
                <td class="audit-old">{{ formatValue(change.old) }}</td>
                <td class="audit-new">{{ formatValue(change.new) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="event.meta && Object.keys(event.meta).length" class="audit-meta">
        <h6 class="audit-detail-heading">Метаданные</h6>
        <pre class="audit-meta__pre">{{ JSON.stringify(event.meta, null, 2) }}</pre>
      </div>

      <p
        v-if="!(event.changes?.length) && !(event.meta && Object.keys(event.meta).length)"
        class="audit-detail-empty text-muted mb-0"
      >
        Дополнительных сведений об этом событии нет.
      </p>
    </template>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
    </template>
  </ModalCenter>
</template>

<style scoped lang="scss">
.audit-detail-meta {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--color-primary-text);

  &__ip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }
}

.audit-detail-ip {
  cursor: help;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}

.audit-detail-heading {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-secondary-text);
}

.audit-changes {
  margin-bottom: 1rem;

  &__table {
    font-size: 0.8125rem;

    th {
      color: var(--color-secondary-text);
      font-weight: 600;
    }
  }
}

.audit-old {
  color: var(--bs-danger, #dc3545);
}

.audit-new {
  color: var(--bs-success, #198754);
}

.audit-meta {
  &__pre {
    margin: 0;
    padding: 0.75rem;
    background: var(--color-secondary-background);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    max-height: 260px;
    overflow: auto;
    color: var(--color-primary-text);
  }
}
</style>
