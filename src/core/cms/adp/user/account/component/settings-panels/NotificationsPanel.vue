<script setup>
import { computed, inject, onActivated, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SelectBox from '@/components/SelectBox.vue'
import SettingsCard from '@/components/SettingsCard.vue'
import SettingsCardRow from '@/components/SettingsCardRow.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useToast } from '@/js/utils/toast.js'
import { useNotificationSettings } from '@/core/notifications/js/useNotificationSettings.js'
import {
  NOTIFICATION_NAV_KEY,
  anchorIdBrowser,
  anchorIdCategory,
  anchorIdGlobal,
  anchorIdModule,
  anchorIdModules,
  anchorIdRetention,
} from '@/core/notifications/js/useNotificationSettingsNav.js'
import NotificationSettingsTable from '@/core/notifications/components/NotificationSettingsTable.vue'
import BrowserNotificationsSettings from '@/core/notifications/components/BrowserNotificationsSettings.vue'

const { t } = useAppI18n()
const toast = useToast()
const userStore = useUserStore()
const notificationNav = inject(NOTIFICATION_NAV_KEY, null)

const {
  loading,
  saving,
  loadError,
  globalSwitches,
  sections,
  sidebarActivityDays,
  autoArchiveDays,
  hasSections,
  load,
  toggleEvent,
  toggleGlobal,
  setSidebarActivityDays,
  setAutoArchiveDays,
  setSaveErrorHandler,
} = useNotificationSettings()

const activityDaysOptions = computed(() =>
  [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    id: n,
    name: t(`settings.notifications.activityDays.${n}`),
  })),
)

const activityDaysModel = computed({
  get: () => sidebarActivityDays.value,
  set: (value) => setSidebarActivityDays(value),
})

const archiveDaysOptions = computed(() =>
  [7, 14, 30, 60, 90].map((n) => ({
    id: n,
    name: t(`settings.notifications.archiveDays.${n}`),
  })),
)

const archiveDaysModel = computed({
  get: () => autoArchiveDays.value,
  set: (value) => setAutoArchiveDays(value),
})

const modulesGroupExpanded = computed(
  () => notificationNav?.modulesGroupExpanded?.value ?? true,
)

setSaveErrorHandler(() => {
  toast.error(t('settings.notifications.saveFailed'))
})

const userEmail = computed(() => userStore.profile?.email || '')

const GLOBAL_CHANNELS = computed(() => [
  {
    key: 'email',
    label: t('settings.notifications.channelEmail'),
    hint: t('settings.notifications.channelEmailHint'),
  },
  {
    key: 'in_app',
    label: t('settings.notifications.channelInApp'),
    hint: t('settings.notifications.channelInAppHint'),
  },
])

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

watch(loading, async (isLoading, wasLoading) => {
  if (wasLoading && !isLoading) {
    await nextTick()
    await syncNavAnchors()
  }
})

onMounted(async () => {
  const readyPromise = userStore.isInitialized
    ? Promise.resolve()
    : userStore.ensureUserReady().catch(() => { /* email в заголовке опционален */ })
  await Promise.all([readyPromise, load()])
  await syncNavAnchors()
})

onActivated(async () => {
  await nextTick()
  await syncNavAnchors()
})

onUnmounted(() => {
  notificationNav?.teardownObserver()
})
</script>

<template>
  <div class="settings-panel">
    <h2 class="settings-panel__title">
      {{ t('settings.notifications.title') }}
      <span v-if="saving" class="settings-panel__saving text-muted">{{ t('settings.notifications.saving') }}</span>
    </h2>
    <p v-if="userEmail" class="settings-panel__hint text-muted">
      {{ t('settings.notifications.forUser', { email: userEmail }) }}
    </p>

    <LoadingContentArea :loading="loading" min-height="8rem">
      <div v-if="loadError" class="notif-panel__empty text-muted">
        {{ t('settings.notifications.loadFailed') }}
        <button type="button" class="btn btn-sm btn-link" @click="load">{{ t('settings.notifications.retry') }}</button>
      </div>

      <template v-else>
        <section :id="anchorIdBrowser()" class="notif-panel__anchor notif-panel__section">
          <h3 class="notif-panel__section-title">{{ t('settings.browserNotifications.caption') }}</h3>
          <BrowserNotificationsSettings />
        </section>

        <section :id="anchorIdRetention()" class="notif-panel__anchor notif-panel__section">
          <h3 class="notif-panel__section-title">{{ t('settings.notifications.inboxRetention') }}</h3>
          <SettingsCard>
            <SettingsCardRow :label="t('settings.notifications.activityInBellLabel')" :hint="t('settings.notifications.activityInBellHint')" label-for="notif-sidebar-activity-days" control-size="sm">
              <SelectBox id="notif-sidebar-activity-days" v-model="activityDaysModel" :options="activityDaysOptions" :include-all-option="false" :aria-label="t('settings.notifications.activityInBellLabel')"/>
            </SettingsCardRow>
            <SettingsCardRow :label="t('settings.notifications.autoArchiveLabel')" :hint="t('settings.notifications.autoArchiveHint')" label-for="notif-auto-archive-days" control-size="sm" last>
              <SelectBox id="notif-auto-archive-days" v-model="archiveDaysModel" :options="archiveDaysOptions" :include-all-option="false" :aria-label="t('settings.notifications.autoArchiveLabel')"/>
            </SettingsCardRow>
          </SettingsCard>
        </section>

        <section :id="anchorIdGlobal()" class="notif-panel__anchor notif-panel__section">
          <h3 class="notif-panel__section-title">{{ t('settings.notifications.channels') }}</h3>
          <SettingsCard>
            <SettingsCardRow v-for="(channel, index) in GLOBAL_CHANNELS" :key="channel.key" :label="channel.label" :hint="channel.hint" control-size="auto" :last="index === GLOBAL_CHANNELS.length - 1">
              <div class="form-check form-switch notif-panel__switch">
                <input :id="`notif-global-${channel.key}`" type="checkbox" class="form-check-input" role="switch" :checked="globalSwitches[channel.key]" @change="toggleGlobal(channel.key, $event.target.checked)"/>
              </div>
            </SettingsCardRow>
          </SettingsCard>
        </section>

        <div v-if="!hasSections" class="notif-panel__empty text-muted">
          {{ t('settings.notifications.noConfigurable') }}
        </div>

        <section v-else :id="anchorIdModules()" class="notif-panel__anchor notif-panel__modules-group">
          <button type="button" class="notif-panel__module-header" :aria-expanded="modulesGroupExpanded" @click="notificationNav?.toggleModulesGroupExpanded()">
            <span class="notif-panel__section-title notif-panel__section-title--inline">
              {{ t('settings.notifications.moduleNotifications') }}
            </span>
            <ChevronUp
              v-if="modulesGroupExpanded"
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
            <div v-if="modulesGroupExpanded" class="notif-panel__modules-body">
              <div
                v-for="section in sections"
                :key="section.module"
                :id="anchorIdModule(section.module)"
                class="notif-panel__anchor notif-panel__module-block"
              >
                <button
                  type="button"
                  class="notif-panel__module-header notif-panel__module-header--nested"
                  :aria-expanded="notificationNav?.isModuleExpanded(section.module) ?? true"
                  @click="notificationNav?.toggleModuleExpanded(section.module)"
                >
                  <span class="notif-panel__module-title">{{ section.module_label }}</span>
                  <ChevronUp
                    v-if="notificationNav?.isModuleExpanded(section.module)"
                    :size="16"
                    class="notif-panel__module-chevron"
                    aria-hidden="true"
                  />
                  <ChevronDown
                    v-else
                    :size="16"
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
                      class="notif-panel__anchor notif-panel__section notif-panel__section--nested"
                    >
                      <p class="notif-panel__caption">{{ category.category_label }}</p>
                      <SettingsCard>
                        <NotificationSettingsTable
                          :events="category.events"
                          :source-module="section.module"
                          :global-switches="globalSwitches"
                          @toggle="handleToggle"
                        />
                      </SettingsCard>
                    </div>
                  </div>
                </Transition>
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

.notif-panel__section-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary-text);

  &--inline {
    margin: 0;
  }
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

  &--nested {
    margin-bottom: 0.5rem;
  }
}

.notif-panel__module-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.notif-panel__module-chevron {
  flex-shrink: 0;
  color: var(--color-secondary-text);
}

.notif-panel__modules-group {
  margin-bottom: 0.25rem;
}

.notif-panel__modules-body {
  overflow: hidden;
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

.notif-panel__switch {
  flex-shrink: 0;

  .form-check-input {
    cursor: pointer;
  }
}

.notif-panel__section {
  margin-bottom: 1.25rem;

  &--nested {
    margin-bottom: 0.75rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

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
  max-height: 4000px;
}

.nav-sublist-enter-from,
.nav-sublist-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>