<script setup>
import { computed, onMounted, ref } from 'vue'
import { Bell } from 'lucide-vue-next'
import SettingsCard from '@/components/SettingsCard.vue'
import SettingsCardRow from '@/components/SettingsCardRow.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useToast } from '@/js/utils/toast.js'
import { BROWSER_NOTIFICATION_PREFS, readBrowserNotificationPref, writeBrowserNotificationPref, } from '@/core/notifications/js/browserNotificationPrefs.js'

const { t } = useAppI18n()
const toast = useToast()

const browserEnabled = ref(false)
const privacyEnabled = ref(true)
const soundEnabled = ref(true)
const permission = ref('default')
const previewing = ref(false)

const permissionHint = computed(() => {
  if (permission.value === 'denied') {
    return t('settings.browserNotifications.denied')
  }
  if (permission.value === 'unsupported') {
    return t('settings.browserNotifications.unsupported')
  }
  return ''
})

function syncPermission() {
  if (typeof window.Notification === 'undefined') {
    permission.value = 'unsupported'
    return
  }
  permission.value = window.Notification.permission
}

function loadPrefs() {
  browserEnabled.value = readBrowserNotificationPref(BROWSER_NOTIFICATION_PREFS.enabled, false)
  privacyEnabled.value = readBrowserNotificationPref(BROWSER_NOTIFICATION_PREFS.privacy, true)
  soundEnabled.value = readBrowserNotificationPref(BROWSER_NOTIFICATION_PREFS.sound, true)
  syncPermission()
}

async function setBrowserEnabled(enabled) {
  if (enabled && typeof window.Notification !== 'undefined') {
    if (window.Notification.permission === 'default') {
      permission.value = await window.Notification.requestPermission()
    } else {
      syncPermission()
    }
  }
  browserEnabled.value = Boolean(enabled)
  writeBrowserNotificationPref(BROWSER_NOTIFICATION_PREFS.enabled, browserEnabled.value)
}

function setPrivacyEnabled(enabled) {
  privacyEnabled.value = Boolean(enabled)
  writeBrowserNotificationPref(BROWSER_NOTIFICATION_PREFS.privacy, privacyEnabled.value)
}

function setSoundEnabled(enabled) {
  soundEnabled.value = Boolean(enabled)
  writeBrowserNotificationPref(BROWSER_NOTIFICATION_PREFS.sound, soundEnabled.value)
}

async function handlePreview() {
  previewing.value = true
  try {
    if (typeof window.Notification === 'undefined') {
      permission.value = 'unsupported'
      toast.info(t('settings.browserNotifications.unavailableToast'))
      return
    }
    if (window.Notification.permission === 'default') {
      permission.value = await window.Notification.requestPermission()
    } else {
      syncPermission()
    }
    if (permission.value !== 'granted') {
      toast.warning(t('settings.browserNotifications.allowInBrowser'))
      return
    }
    const body = privacyEnabled.value
      ? t('settings.browserNotifications.privateBody')
      : t('settings.browserNotifications.sampleBody')
    const n = new window.Notification('ERGO MS', {
      body,
      tag: 'ergo-browser-notif-preview',
    })
    setTimeout(() => n.close(), 5000)
    toast.success(t('settings.browserNotifications.testSent'))
  } finally {
    previewing.value = false
  }
}

onMounted(loadPrefs)
</script>

<template>
  <section class="browser-notif-settings">
    <p class="browser-notif-settings__hint">
      {{ t('settings.browserNotifications.intro') }}
    </p>

    <SettingsCard :show-footer="browserEnabled">
      <SettingsCardRow :label="t('settings.browserNotifications.show')" :hint="t('settings.browserNotifications.showHint')" control-size="auto">
        <div class="form-check form-switch browser-notif-settings__switch">
          <input id="browser-notif-enabled" type="checkbox" class="form-check-input" role="switch" :checked="browserEnabled" @change="setBrowserEnabled($event.target.checked)"/>
        </div>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.browserNotifications.hideDetails')" :hint="t('settings.browserNotifications.hideDetailsHint')" control-size="auto">
        <div class="form-check form-switch browser-notif-settings__switch">
          <input id="browser-notif-privacy" type="checkbox" class="form-check-input" role="switch" :checked="privacyEnabled" @change="setPrivacyEnabled($event.target.checked)"/>
        </div>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.browserNotifications.sound')" :hint="t('settings.browserNotifications.soundHint')" control-size="auto" last>
        <div class="form-check form-switch browser-notif-settings__switch">
          <input id="browser-notif-sound" type="checkbox" class="form-check-input" role="switch" :checked="soundEnabled" @change="setSoundEnabled($event.target.checked)"/>
        </div>
      </SettingsCardRow>

      <template #footer>
        <button type="button" class="btn btn-sm browser-notif-settings__preview" :disabled="previewing" @click="handlePreview">
          <Bell :size="14" class="browser-notif-settings__preview-icon" aria-hidden="true" />
          <span>{{ t('settings.browserNotifications.preview') }}</span>
        </button>
      </template>
    </SettingsCard>

    <p v-if="permissionHint" class="browser-notif-settings__permission text-muted">
      {{ permissionHint }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.browser-notif-settings {
  margin-bottom: 0;
}

.browser-notif-settings__hint {
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  margin: 0 0 0.75rem;
}

.browser-notif-settings__switch {
  margin: 0;
  min-height: 1.5rem;
  display: flex;
  align-items: center;

  .form-check-input {
    cursor: pointer;
  }
}

.browser-notif-settings__preview {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);

  &:hover:not(:disabled) {
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
  }

  &:disabled {
    opacity: 0.65;
  }
}

.browser-notif-settings__preview-icon {
  flex-shrink: 0;
  vertical-align: middle;
}

.browser-notif-settings__permission {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}
</style>