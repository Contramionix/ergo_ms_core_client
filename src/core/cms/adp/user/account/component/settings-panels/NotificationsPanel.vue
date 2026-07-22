<script setup>
import { computed, inject, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useToast } from '@/js/utils/toast.js'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useNotificationSettings } from '@/core/notifications/js/useNotificationSettings.js'
import {
  NOTIFICATION_NAV_KEY,
  anchorIdCategory,
  anchorIdGlobal,
  anchorIdModule,
} from '@/core/notifications/js/useNotificationSettingsNav.js'
import NotificationSettingsTable from '@/core/notifications/components/NotificationSettingsTable.vue'
import BrowserNotificationsSettings from '@/core/notifications/components/BrowserNotificationsSettings.vue'

const toast = useToast()
const userStore = useUserStore()
const notificationNav = inject(NOTIFICATION_NAV_KEY, null)

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

function handleToggle({ sourceModule, eventKey, channel, enabled }) {
  toggleEvent(sourceModule, eventKey, channel, enabled)
}

async function syncNavAnchors() {
  if (!notificationNav) return
  notificationNav.setSections(sections.value)
  await nextTick()
  notificationNav.syncAnchors()
}

watch(sections, () => {
  syncNavAnchors()
})

onMounted(async () => {
  if (!userStore.isInitialized) {
    try {
      await userStore.ensureUserReady()
    } catch { /* email в заголовке опционален */ }
  }
  await load()
  await syncNavAnchors()
})

onUnmounted(() => {
  notificationNav?.teardownObserver()
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

    <LoadingContentArea :loading="loading" min-height="8rem">
    <div v-if="loadError" class="notif-panel__empty text-muted">
        Не удалось загрузить настройки уведомлений.
        <button type="button" class="btn btn-sm btn-link" @click="load">Повторить</button>
      </div>

      <template v-else>
        <BrowserNotificationsSettings />

        <section :id="anchorIdGlobal()" class="notif-panel__anchor notif-panel__section">
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
        </section>

        <div v-if="!hasSections" class="notif-panel__empty text-muted">
          Нет настраиваемых уведомлений.
        </div>

        <section
          v-for="section in sections"
          :key="section.module"
          :id="anchorIdModule(section.module)"
          class="notif-panel__anchor notif-panel__module-block"
        >
          <button
            type="button"
            class="notif-panel__module-header"
            :aria-expanded="notificationNav?.isModuleExpanded(section.module) ?? true"
            @click="notificationNav?.toggleModuleExpanded(section.module)"
          >
            <span class="notif-panel__module-title">{{ section.module_label }}</span>
            <ChevronUp
              v-if="notificationNav?.isModuleExpanded(section.module)"
              :size="18"
              class="notif-panel__module-chevron"
              aria-hidden="true"
            />
            <ChevronDown
              v-else
              :size="18"
              class="notif-panel__module-chevron"
              aria-hidden="true"
            />
          </button>

          <Transition name="nav-sublist">
            <div
              v-if="notificationNav ? notificationNav.isModuleExpanded(section.module) : true"
              class="notif-panel__module-categories"
            >
              <div
                v-for="category in section.categories"
                :key="`${section.module}:${category.category}`"
                :id="anchorIdCategory(section.module, category.category)"
                class="notif-panel__anchor notif-panel__section"
              >
                <p class="notif-panel__caption">{{ category.category_label }}</p>
                <div class="settings-card">
                  <NotificationSettingsTable
                    :events="category.events"
                    :source-module="section.module"
                    :global-switches="globalSwitches"
                    @toggle="handleToggle"
                  />
                </div>
              </div>
            </div>
          </Transition>
        </section>
      </template>
    </LoadingContentArea>
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

.notif-panel__anchor {
  scroll-margin-top: 0.75rem;
}

.notif-panel__module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  margin: 0 0 0.75rem;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover,
  &:focus-visible {
    opacity: 0.85;
    outline: none;
  }
}

.notif-panel__module-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.notif-panel__module-chevron {
  flex-shrink: 0;
  color: var(--color-secondary-text);
}

.notif-panel__module-categories {
  overflow: hidden;
}

.notif-panel__module-block {
  margin-bottom: 1.25rem;

  &:last-child {
    margin-bottom: 0;
  }
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
  margin-bottom: 0;
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

.nav-sublist-enter-active,
.nav-sublist-leave-active {
  transition: opacity 0.15s ease, max-height 0.2s ease;
  max-height: 2000px;
}

.nav-sublist-enter-from,
.nav-sublist-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
