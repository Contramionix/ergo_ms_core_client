<script setup>
import SelectBox from '@/components/SelectBox.vue'
import { showInfo, showSuccess, showWarning, showError } from '@/js/utils/toast.js'
import { useToastSettings } from '@/js/utils/toastSettings.js'

const {
  settings,
  TOAST_POSITION_OPTIONS,
  TOAST_DURATION_PRESET_OPTIONS,
  TOAST_MAX_OPTIONS,
} = useToastSettings()

function previewToast(type) {
  const messages = {
    success: 'Пример успешного уведомления',
    info: 'Пример информационного уведомления',
    warning: 'Пример предупреждения',
    error: 'Пример сообщения об ошибке',
  }

  const handlers = {
    success: showSuccess,
    info: showInfo,
    warning: showWarning,
    error: showError,
  }

  handlers[type]?.(messages[type])
}
</script>

<template>
  <div class="settings-panel">
    <h1 class="settings-panel__title">Всплывающие уведомления</h1>
    <p class="settings-panel__hint text-muted">
      Настройки кратких сообщений в углу экрана при сохранении, ошибках и других действиях.
    </p>

    <div class="settings-card">
      <div class="settings-card__row">
        <div class="settings-card__label-block">
          <span class="settings-card__label">Показывать уведомления</span>
          <span class="settings-card__hint">Отключите, чтобы скрыть все всплывающие сообщения</span>
        </div>
        <div class="form-check form-switch toast-panel__switch">
          <input
            id="toast-enabled"
            v-model="settings.enabled"
            type="checkbox"
            class="form-check-input"
            role="switch"
          />
        </div>
      </div>

      <div class="settings-card__row">
        <label class="settings-card__label" for="toast-position">Положение на экране</label>
        <div class="settings-card__control">
          <SelectBox
            id="toast-position"
            v-model="settings.position"
            :options="TOAST_POSITION_OPTIONS"
            :include-all-option="false"
            fixed-trigger-label-font-size
            :disabled="!settings.enabled"
          />
        </div>
      </div>

      <div class="settings-card__row">
        <label class="settings-card__label" for="toast-duration">Длительность показа</label>
        <div class="settings-card__control">
          <SelectBox
            id="toast-duration"
            v-model="settings.durationPreset"
            :options="TOAST_DURATION_PRESET_OPTIONS"
            :include-all-option="false"
            fixed-trigger-label-font-size
            :disabled="!settings.enabled"
          />
        </div>
      </div>

      <div class="settings-card__row">
        <label class="settings-card__label" for="toast-max">Максимум одновременно</label>
        <div class="settings-card__control">
          <SelectBox
            id="toast-max"
            v-model="settings.maxToasts"
            :options="TOAST_MAX_OPTIONS"
            :include-all-option="false"
            cast-to-number
            fixed-trigger-label-font-size
            :disabled="!settings.enabled"
          />
        </div>
      </div>

      <div class="settings-card__row">
        <div class="settings-card__label-block">
          <span class="settings-card__label">Пауза при наведении</span>
          <span class="settings-card__hint">Таймер останавливается, пока курсор над уведомлением</span>
        </div>
        <div class="form-check form-switch toast-panel__switch">
          <input
            id="toast-pause-hover"
            v-model="settings.pauseOnHover"
            type="checkbox"
            class="form-check-input"
            role="switch"
            :disabled="!settings.enabled"
          />
        </div>
      </div>

      <div class="settings-card__row">
        <div class="settings-card__label-block">
          <span class="settings-card__label">Перетаскивание</span>
          <span class="settings-card__hint">Можно сдвинуть уведомление мышью или пальцем</span>
        </div>
        <div class="form-check form-switch toast-panel__switch">
          <input
            id="toast-draggable"
            v-model="settings.draggable"
            type="checkbox"
            class="form-check-input"
            role="switch"
            :disabled="!settings.enabled"
          />
        </div>
      </div>

      <div class="settings-card__row settings-card__row--last">
        <div class="settings-card__label-block">
          <span class="settings-card__label">Скрыть индикатор времени</span>
          <span class="settings-card__hint">Не показывать полоску обратного отсчёта внизу</span>
        </div>
        <div class="form-check form-switch toast-panel__switch">
          <input
            id="toast-hide-progress"
            v-model="settings.hideProgressBar"
            type="checkbox"
            class="form-check-input"
            role="switch"
            :disabled="!settings.enabled"
          />
        </div>
      </div>
    </div>

    <section class="toast-panel__preview">
      <p class="toast-panel__preview-caption">Проверка</p>
      <div class="toast-panel__preview-actions">
        <button
          type="button"
          class="btn btn-sm btn-outline-success"
          :disabled="!settings.enabled"
          @click="previewToast('success')"
        >
          Успех
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-info"
          :disabled="!settings.enabled"
          @click="previewToast('info')"
        >
          Инфо
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-warning"
          :disabled="!settings.enabled"
          @click="previewToast('warning')"
        >
          Предупреждение
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          :disabled="!settings.enabled"
          @click="previewToast('error')"
        >
          Ошибка
        </button>
      </div>
    </section>
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
  margin-bottom: 0.375rem;
}

.settings-panel__hint {
  font-size: 0.9375rem;
  margin-bottom: 1rem;
}

.settings-card {
  width: 100%;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;
}

.settings-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);

  @media (max-width: 575.98px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
}

.settings-card__row--last {
  border-bottom: none;
}

.settings-card__label-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1 1 auto;
}

.settings-card__label {
  font-size: 0.875rem;
  color: var(--color-primary-text);
  margin: 0;
}

.settings-card__hint {
  font-size: 0.75rem;
  color: var(--color-secondary-text);
  opacity: 0.85;
}

.settings-card__control {
  flex: 0 0 auto;
  width: clamp(11rem, 50%, 14rem);
  min-width: 0;

  @media (max-width: 575.98px) {
    width: 100%;
  }

  :deep(.select-box) {
    --select-box-font-size: 0.8125rem;
    --select-box-icon-size: 14px;
    --select-box-trigger-min-height: 30px;
    --select-box-item-padding-y: 0.25rem;
    --select-box-item-padding-x: 0.5rem;
  }

  :deep(.select-trigger) {
    line-height: 1.2;
  }
}

.toast-panel__switch {
  flex-shrink: 0;

  .form-check-input {
    cursor: pointer;
  }
}

.toast-panel__preview {
  margin-top: 1.25rem;
}

.toast-panel__preview-caption {
  margin: 0 0 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-secondary-text, rgba(128, 128, 128, 0.95));
}

.toast-panel__preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
