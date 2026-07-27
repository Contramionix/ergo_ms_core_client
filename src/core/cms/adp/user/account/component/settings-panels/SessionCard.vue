<script setup>
import { computed } from 'vue'
import { Globe, Laptop, Monitor, Smartphone, Tablet } from 'lucide-vue-next'

const props = defineProps({
  device: { type: Object, required: true },
  revoking: { type: Boolean, default: false },
})

defineEmits(['revoke'])

const iconMap = {
  desktop: Monitor,
  laptop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
}

const DeviceIcon = computed(() => iconMap[props.device.deviceType] || Globe)

const canRevoke = computed(() => !props.device.isCurrent)

const ipAddressDisplay = computed(() => {
  const ip = (props.device.ipAddress || '').trim()
  if (!ip) return '—'
  const location = (props.device.locationLine || '').trim()
  return location ? `${ip} (${location})` : ip
})
</script>

<template>
  <article class="session-card" :class="{ 'session-card--current': device.isCurrent }">
    <div class="session-card__main">
      <div class="session-card__icon-wrap" aria-hidden="true">
        <component :is="DeviceIcon" :size="20" class="session-card__icon" />
      </div>

      <div class="session-card__content">
        <div class="session-card__header">
          <h3 class="session-card__title">{{ device.deviceName }}</h3>
          <span v-if="device.isCurrent" class="session-card__badge">Текущая сессия</span>
        </div>

        <p class="session-card__subtitle">{{ device.subtitle }}</p>

        <dl class="session-card__meta">
          <div class="session-card__meta-row">
            <dt>IP-адрес</dt>
            <dd>{{ ipAddressDisplay }}</dd>
          </div>
          <div class="session-card__meta-row">
            <dt>Последняя активность</dt>
            <dd>{{ device.formattedLastActivity }}</dd>
          </div>
          <div class="session-card__meta-row">
            <dt>Сессия создана</dt>
            <dd>{{ device.formattedCreatedAt }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="session-card__actions">
      <button
        type="button"
        class="btn sessions__revoke"
        :disabled="revoking || !canRevoke"
        :title="canRevoke ? 'Завершить эту сессию' : 'Нельзя завершить текущую сессию'"
        @click="$emit('revoke', device.id)"
      >
        {{ revoking ? '...' : 'Отозвать' }}
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.session-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }

  @media (width < $ui-bp-sm) {
    flex-direction: column;
    align-items: stretch;
  }
}

.session-card--current {
  background: color-mix(in srgb, var(--color-accent, #0d6efd) 6%, var(--color-primary-background));
}

.session-card__main {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
  flex: 1 1 auto;
}

.session-card__icon-wrap {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: var(--color-secondary-background);
  color: var(--color-primary-text);
}

.session-card__content {
  min-width: 0;
  flex: 1 1 auto;
}

.session-card__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.125rem;
}

.session-card__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.session-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-accent, #0d6efd);
  background: color-mix(in srgb, var(--color-accent, #0d6efd) 12%, transparent);
}

.session-card__subtitle {
  margin: 0 0 0.625rem;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.session-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.375rem 1rem;
  margin: 0;

  @media (width < $ui-bp-md) {
    grid-template-columns: 1fr;
  }
}

.session-card__meta-row {
  min-width: 0;

  dt {
    margin: 0 0 0.125rem;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--color-secondary-text);
  }

  dd {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-primary-text);
    word-break: break-word;
  }
}

.session-card__actions {
  flex-shrink: 0;
  padding-top: 0.125rem;

  @media (width < $ui-bp-sm) {
    padding-top: 0;
  }
}

.sessions__revoke {
  font-size: 0.8125rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
  background: var(--color-primary-background);
  color: var(--color-primary-text);

  &:hover:not(:disabled) {
    background: var(--color-hover-background);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}
</style>
