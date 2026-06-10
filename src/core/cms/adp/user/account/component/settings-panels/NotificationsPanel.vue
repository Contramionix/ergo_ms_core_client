<script setup>
import { computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useNotificationSettings } from '@/core/notifications/js/useNotificationSettings.js'
import NotificationSettingsTable from '@/core/notifications/components/NotificationSettingsTable.vue'

const toast = useToast()
const userStore = useUserStore()

const {
  loading,
  saving,
  loadError,
  globalSwitches,
  sections,
  hasSections,
  load,
  toggleEvent,
  toggleGlobal,
  setSaveErrorHandler,
} = useNotificationSettings()

setSaveErrorHandler(() => {
  toast.error('Не удалось сохранить настройки уведомлений')
})

const userEmail = computed(() => userStore.profile?.email || '')

const GLOBAL_CHANNELS = [
  { key: 'email', label: 'По эл. почте', hint: 'Глобально включает или отключает письма' },
  { key: 'in_app', label: 'В клиенте', hint: 'Уведомления в колокольчике и ленте системы' },
]

function categoryTitle(section, category) {
  if (category.category_label) {
    return `${section.module_label} — ${category.category_label}`
  }
  return section.module_label
}

function handleToggle({ sourceModule, eventKey, channel, enabled }) {
  toggleEvent(sourceModule, eventKey, channel, enabled)
}

onMounted(async () => {
  if (!userStore.isInitialized) {
    try {
      await userStore.initializeUser()
    } catch { /* email в заголовке опционален */ }
  }
  await load()
})
</script>

<template>
  <div class="settings-panel">
    <h2 class="settings-panel__title">
      Уведомления
      <span v-if="saving" class="settings-panel__saving text-muted">сохранение…</span>
    </h2>
    <p v-if="userEmail" class="settings-panel__hint text-muted">
      Настройки уведомлений для {{ userEmail }}
    </p>

    <div v-if="loading" class="notif-panel__loading">
      <SpinnerLoading color="primary" />
    </div>

    <template v-else>
      <div v-if="loadError" class="notif-panel__empty text-muted">
        Не удалось загрузить настройки уведомлений.
        <button type="button" class="btn btn-sm btn-link" @click="load">Повторить</button>
      </div>

      <template v-else>
        <p class="notif-panel__caption">Каналы доставки</p>
        <div class="settings-card notif-panel__global">
          <div
            v-for="(channel, index) in GLOBAL_CHANNELS"
            :key="channel.key"
            class="settings-card__row"
            :class="{ 'settings-card__row--last': index === GLOBAL_CHANNELS.length - 1 }"
          >
            <div class="settings-card__label-block">
              <span class="settings-card__label">{{ channel.label }}</span>
              <span class="settings-card__hint">{{ channel.hint }}</span>
            </div>
            <div class="form-check form-switch notif-panel__switch">
              <input
                :id="`notif-global-${channel.key}`"
                type="checkbox"
                class="form-check-input"
                role="switch"
                :checked="globalSwitches[channel.key]"
                @change="toggleGlobal(channel.key, $event.target.checked)"
              />
            </div>
          </div>
        </div>

        <div v-if="!hasSections" class="notif-panel__empty text-muted">
          Нет настраиваемых уведомлений.
        </div>

        <template v-for="section in sections" :key="section.module">
          <div
            v-for="category in section.categories"
            :key="`${section.module}:${category.category}`"
            class="notif-panel__section"
          >
            <p class="notif-panel__caption">{{ categoryTitle(section, category) }}</p>
            <div class="settings-card">
              <NotificationSettingsTable
                :events="category.events"
                :source-module="section.module"
                :global-switches="globalSwitches"
                @toggle="handleToggle"
              />
            </div>
          </div>
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.settings-panel {
  width: 100%;
}

.settings-panel__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin-bottom: 0.5rem;
}

.settings-panel__saving {
  font-size: 0.75rem;
  font-weight: 400;
  margin-left: 0.5rem;
}

.settings-panel__hint {
  font-size: 0.9375rem;
  margin-bottom: 1rem;
}

.notif-panel__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 160px;
}

.notif-panel__caption {
  margin: 0 0 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-secondary-text, rgba(128, 128, 128, 0.95));
}

.settings-card {
  width: 100%;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;
}

.notif-panel__global {
  margin-bottom: 1.25rem;
}

.settings-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.settings-card__row--last {
  border-bottom: none;
}

.settings-card__label-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.settings-card__label {
  font-size: 0.875rem;
  color: var(--color-primary-text);
}

.settings-card__hint {
  font-size: 0.75rem;
  color: var(--color-secondary-text);
  opacity: 0.85;
}

.notif-panel__switch {
  flex-shrink: 0;

  .form-check-input {
    cursor: pointer;
  }
}

.notif-panel__section {
  margin-bottom: 1.25rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.notif-panel__empty {
  padding: 1rem 0;
  font-size: 0.875rem;
}
</style>
