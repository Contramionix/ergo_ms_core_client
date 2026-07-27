<script setup>
import { computed, onMounted, ref } from 'vue'
import { Bell } from 'lucide-vue-next'
import { useToast } from '@/js/utils/toast.js'
import {
  BROWSER_NOTIFICATION_PREFS,
  readBrowserNotificationPref,
  writeBrowserNotificationPref,
} from '@/core/notifications/js/browserNotificationPrefs.js'

const toast = useToast()

const browserEnabled = ref(false)
const privacyEnabled = ref(true)
const soundEnabled = ref(true)
const permission = ref('default')
const previewing = ref(false)

const permissionHint = computed(() => {
  if (permission.value === 'denied') {
    return 'Браузер запретил системные уведомления. Всплывающие уведомления в приложении всё равно могут работать.'
  }
  if (permission.value === 'unsupported') {
    return 'Этот браузер не поддерживает системные уведомления.'
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
      toast.info('Системные уведомления недоступны в этом браузере')
      return
    }
    if (window.Notification.permission === 'default') {
      permission.value = await window.Notification.requestPermission()
    } else {
      syncPermission()
    }
    if (permission.value !== 'granted') {
      toast.warning('Разрешите уведомления в настройках браузера')
      return
    }
    const body = privacyEnabled.value
      ? 'Новое уведомление. Откройте приложение, чтобы посмотреть подробности.'
      : 'Пример: вам назначена задача. Откройте карточку в системе.'
    const n = new window.Notification('ERGO MS', {
      body,
      tag: 'ergo-browser-notif-preview',
    })
    setTimeout(() => n.close(), 5000)
    toast.success('Тестовое уведомление отправлено')
  } finally {
    previewing.value = false
  }
}

onMounted(loadPrefs)
</script>

<template>
  <section class="browser-notif-settings">
    <p class="browser-notif-settings__caption">Уведомления браузера</p>
    <p class="browser-notif-settings__hint">
      Пока вкладка открыта — всплывающее уведомление в приложении; когда вкладка в фоне — системное уведомление (если разрешено).
      Сейчас используется в модуле CRM; настройки общие для аккаунта в этом браузере.
    </p>

    <div class="settings-card">
      <div class="settings-card__row">
        <div class="settings-card__label-block">
          <span class="settings-card__label">Показывать уведомления</span>
          <span class="settings-card__hint">Включает всплывающие уведомления в приложении и попытку показать системное уведомление</span>
        </div>
        <div class="form-check form-switch browser-notif-settings__switch">
          <input
            id="browser-notif-enabled"
            type="checkbox"
            class="form-check-input"
            role="switch"
            :checked="browserEnabled"
            @change="setBrowserEnabled($event.target.checked)"
          />
        </div>
      </div>

      <div class="settings-card__row">
        <div class="settings-card__label-block">
          <span class="settings-card__label">Скрывать тему и детали</span>
          <span class="settings-card__hint">В уведомлении — нейтральный текст без данных заявки или задачи</span>
        </div>
        <div class="form-check form-switch browser-notif-settings__switch">
          <input
            id="browser-notif-privacy"
            type="checkbox"
            class="form-check-input"
            role="switch"
            :checked="privacyEnabled"
            @change="setPrivacyEnabled($event.target.checked)"
          />
        </div>
      </div>

      <div class="settings-card__row settings-card__row--last">
        <div class="settings-card__label-block">
          <span class="settings-card__label">Звуковой сигнал</span>
          <span class="settings-card__hint">Короткий сигнал в приложении при новом уведомлении из CRM</span>
        </div>
        <div class="form-check form-switch browser-notif-settings__switch">
          <input
            id="browser-notif-sound"
            type="checkbox"
            class="form-check-input"
            role="switch"
            :checked="soundEnabled"
            :disabled="!browserEnabled"
            @change="setSoundEnabled($event.target.checked)"
          />
        </div>
      </div>
    </div>

    <div class="browser-notif-settings__actions">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="previewing"
        @click="handlePreview"
      >
        <Bell :size="14" class="me-1" aria-hidden="true" />
        Проверить уведомление
      </button>
    </div>
    <p v-if="permissionHint" class="browser-notif-settings__permission text-muted">
      {{ permissionHint }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.browser-notif-settings {
  margin-bottom: 1.5rem;
}

.browser-notif-settings__caption {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ui-text-muted);
  margin: 0 0 0.35rem;
}

.browser-notif-settings__hint {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  margin: 0 0 0.75rem;
}

.browser-notif-settings__switch {
  margin: 0;
  min-height: 1.5rem;
  display: flex;
  align-items: center;
}

.browser-notif-settings__actions {
  margin-top: 0.75rem;
}

.browser-notif-settings__permission {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}

.settings-card {
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: var(--ui-surface);
  overflow: hidden;
}

.settings-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--ui-border);

  &--last {
    border-bottom: none;
  }
}

.settings-card__label-block {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.settings-card__label {
  font-size: 0.9375rem;
  color: var(--ui-text);
}

.settings-card__hint {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
