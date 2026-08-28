<script setup>
import { computed } from 'vue'
import { Copy } from '@lucide/vue'
import ModalCenter from '@/components/ModalCenter.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import Pagination from '@/components/Pagination.vue'
import AuditActorCell from '@/core/cms/adp/admin/AuditLogComponents/AuditActorCell.vue'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  session: { type: Object, default: null },
  events: { type: Array, default: () => [] },
  intervals: { type: Array, default: () => [] },
  eventsLoading: { type: Boolean, default: false },
  eventsPage: { type: Number, default: 1 },
  eventsTotal: { type: Number, default: 0 },
  eventsHasNext: { type: Boolean, default: false },
  eventsPageSize: { type: Number, default: 100 },
})

const emit = defineEmits(['close', 'copy-debug-pack', 'update:eventsPage'])

const { t } = useAppI18n()

const modalTitle = computed(() => {
  const session = props.session
  if (!session) return t('admin.clientMonitor.detailsTitle')
  return session.user_label || session.user_public_id || t('admin.clientMonitor.detailsTitle')
})

const eventsTotalPages = computed(() =>
  Math.max(1, Math.ceil((props.eventsTotal || 0) / (props.eventsPageSize || 100))),
)

function kindLabel(kind) {
  const key = `admin.clientMonitor.kinds.${kind || 'unknown'}`
  const translated = t(key)
  return translated === key ? (kind || '—') : translated
}

function kindClass(kind) {
  return `cm-kind cm-kind--${kind || 'unknown'}`
}

function eventSummary(event) {
  const payload = event.payload || {}
  if (event.kind === 'nav') {
    return payload.path || payload.to || payload.route_name || ''
  }
  if (event.kind === 'api') {
    return [payload.method, payload.path || payload.endpoint, payload.status]
      .filter((part) => part != null && part !== '')
      .join(' ')
  }
  return payload.message || payload.event || ''
}

function onEventsPageChange(page) {
  emit('update:eventsPage', page)
}
</script>

<template>
  <ModalCenter
    standalone
    modal-id="clientMonitorSessionDetails"
    :title="modalTitle"
    :visible="visible"
    size="xl"
    @close="emit('close')"
  >
    <template v-if="session">
      <div class="cm-detail-meta">
        <div class="cm-detail-meta__header">
          <div class="cm-detail-meta__user">
            <AuditActorCell
              :actor-label="session.user_label"
              :actor-ref="session.user_public_id"
            />
          </div>
          <button
            type="button"
            class="btn-action"
            :title="t('admin.clientMonitor.copySession')"
            :aria-label="t('admin.clientMonitor.copySession')"
            @click="emit('copy-debug-pack', {})"
          >
            <Copy :size="15" aria-hidden="true" />
          </button>
        </div>
        <div class="cm-detail-meta__row">
          <span class="text-muted">{{ t('admin.clientMonitor.sessionIdLabel') }}</span>
          <span class="cm-detail-meta__value">{{ session.public_id }}</span>
        </div>
        <div>
          <span class="text-muted">{{ t('admin.clientMonitor.versionLabel') }}</span>
          {{ session.client_version || '—' }}
        </div>
        <div>
          <span class="text-muted">{{ t('admin.clientMonitor.viewportLabel') }}</span>
          {{ session.viewport || '—' }}
        </div>
        <div v-if="session.user_agent" class="cm-detail-meta__ua">
          <span class="text-muted">{{ t('admin.clientMonitor.userAgentLabel') }}</span>
          {{ session.user_agent }}
        </div>
      </div>

      <div v-if="intervals.length" class="cm-intervals">
        <h6 class="cm-detail-heading">{{ t('admin.clientMonitor.intervals') }}</h6>
        <div class="cm-interval-list">
          <div
            v-for="interval in intervals"
            :key="interval.index"
            class="cm-interval-card"
          >
            <span>#{{ interval.index + 1 }}</span>
            <span>{{ interval.event_count }} {{ t('admin.clientMonitor.eventsUnit') }}</span>
            <span v-if="interval.error_count" class="cm-badge cm-badge--error">
              {{ interval.error_count }} {{ t('admin.clientMonitor.errorsUnit') }}
            </span>
            <button
              type="button"
              class="btn-action"
              :title="t('admin.clientMonitor.copyInterval')"
              :aria-label="t('admin.clientMonitor.copyInterval')"
              @click="emit('copy-debug-pack', { interval_index: interval.index })"
            >
              <Copy :size="15" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <h6 class="cm-detail-heading">{{ t('admin.clientMonitor.timeline') }}</h6>
      <LoadingContentArea
        :loading="eventsLoading"
        :reset-key="session.public_id"
        min-height="10rem"
      >
        <ul v-if="events.length" class="cm-timeline">
          <li
            v-for="event in events"
            :key="event.id"
            class="cm-timeline__item"
          >
            <span :class="kindClass(event.kind)">{{ kindLabel(event.kind) }}</span>
            <span class="cm-timeline__time">{{ formatDateTime(event.created_at) }}</span>
            <span class="cm-timeline__summary">{{ eventSummary(event) }}</span>
            <button
              v-if="event.kind === 'error'"
              type="button"
              class="btn-action"
              :title="t('admin.clientMonitor.copyAroundError')"
              :aria-label="t('admin.clientMonitor.copyAroundError')"
              @click="emit('copy-debug-pack', { around_error_id: event.id })"
            >
              <Copy :size="15" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <div v-else class="text-muted py-3">
          {{ t('admin.clientMonitor.timelineEmpty') }}
        </div>
        <Pagination
          v-if="eventsTotal > eventsPageSize || eventsHasNext || eventsPage > 1"
          class="mt-3"
          :model-value="eventsPage"
          :total-pages="eventsTotalPages"
          :total-items="eventsTotal"
          :page-size="eventsPageSize"
          :has-next-page="eventsHasNext"
          variant="simple"
          layout="toolbar"
          @update:model-value="onEventsPageChange"
        />
      </LoadingContentArea>
    </template>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="emit('close')">
        {{ t('common.close') }}
      </button>
    </template>
  </ModalCenter>
</template>

<style scoped lang="scss">
.cm-detail-meta {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--color-primary-text);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  &__user {
    min-width: 0;
    flex: 1 1 auto;
  }

  &__row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  &__value {
    word-break: break-all;
  }

  &__ua {
    word-break: break-word;
  }
}

.cm-detail-heading {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--color-secondary-text);
}

.cm-intervals {
  margin-bottom: 1.25rem;
}

.cm-interval-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cm-interval-card {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--ui-border, var(--color-border));
  background: var(--ui-surface, var(--color-primary-background));
  color: var(--ui-text, var(--color-primary-text));
  border-radius: 6px;
  padding: 0.25rem 0.35rem 0.25rem 0.7rem;
  font-size: 0.85rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  min-width: 2rem;
  min-height: 2rem;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  color: var(--color-secondary-text);
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  @media (hover: none), (width < $ui-bp-sm) {
    width: 2.75rem;
    height: 2.75rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
  }
}

.cm-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
}

.cm-badge--error {
  color: var(--bs-danger, var(--ui-danger));
}

.cm-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cm-timeline__item {
  display: grid;
  grid-template-columns: 6.5rem 9.5rem 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--ui-border, var(--color-border));
  font-size: 0.85rem;
}

.cm-timeline__time {
  white-space: nowrap;
  color: var(--color-secondary-text);
  font-size: 0.8125rem;
}

.cm-timeline__summary {
  word-break: break-word;
}

.cm-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.7rem;
  white-space: nowrap;
}

.cm-kind--error {
  background: color-mix(in srgb, var(--bs-danger, #dc3545) 12%, transparent);
  color: var(--bs-danger, #dc3545);
}

.cm-kind--warn {
  background: color-mix(in srgb, var(--bs-warning, #ffc107) 18%, transparent);
  color: var(--bs-warning-text-emphasis, #997404);
}

.cm-kind--api {
  background: color-mix(in srgb, var(--color-accent, #0d6efd) 14%, transparent);
  color: var(--color-accent, #0d6efd);
}

.cm-kind--nav {
  background: color-mix(in srgb, var(--color-secondary-text, #6c757d) 14%, transparent);
  color: var(--color-secondary-text, #6c757d);
}

.cm-kind--lifecycle {
  background: color-mix(in srgb, var(--bs-success, #198754) 14%, transparent);
  color: var(--bs-success, #198754);
}

.cm-kind--unknown {
  background: color-mix(in srgb, var(--color-secondary-text, #6c757d) 12%, transparent);
  color: var(--color-secondary-text, #6c757d);
}

@media (width < $ui-bp-md) {
  .cm-timeline__item {
    grid-template-columns: 1fr;
  }
}
</style>
