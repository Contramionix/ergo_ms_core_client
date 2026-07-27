<script setup>
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import { showInfo, showSuccess, showWarning, showError } from '@/js/utils/toast.js'
import { useToastSettings } from '@/js/utils/toastSettings.js'

const {
  settings,
  TOAST_POSITION_OPTIONS,
  TOAST_DURATION_PRESET_OPTIONS,
  TOAST_MAX_OPTIONS,
} = useToastSettings()

const PREVIEW_BUTTONS = [
  {
    type: 'success',
    label: 'Успех',
    description: 'Сохранение и подтверждение',
    icon: CheckCircle,
    handler: showSuccess,
    message: 'Пример успешного уведомления',
  },
  {
    type: 'info',
    label: 'Информация',
    description: 'Подсказки и статус',
    icon: Info,
    handler: showInfo,
    message: 'Пример информационного уведомления',
  },
  {
    type: 'warning',
    label: 'Предупреждение',
    description: 'Внимание к действию',
    icon: AlertTriangle,
    handler: showWarning,
    message: 'Пример предупреждения',
  },
  {
    type: 'error',
    label: 'Ошибка',
    description: 'Сбой или отказ',
    icon: AlertCircle,
    handler: showError,
    message: 'Пример сообщения об ошибке',
  },
]

function previewToast(button) {
  button.handler(button.message)
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
            :include-all-option="false" :disabled="!settings.enabled"
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
            :include-all-option="false" :disabled="!settings.enabled"
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
            cast-to-number :disabled="!settings.enabled"
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
      <div class="toast-panel__preview-header">
        <h2 class="toast-panel__preview-title">Проверка всплывающих уведомлений</h2>
        <p class="toast-panel__preview-hint text-muted">
          Нажмите на тип — появится пример так же, как при работе в системе.
        </p>
      </div>
      <div class="toast-panel__preview-grid">
        <button
          v-for="button in PREVIEW_BUTTONS"
          :key="button.type"
          type="button"
          class="toast-preview-btn"
          :class="`toast-preview-btn--${button.type}`"
          :disabled="!settings.enabled"
          @click="previewToast(button)"
        >
          <span class="toast-preview-btn__icon" aria-hidden="true">
            <component :is="button.icon" :size="20" />
          </span>
          <span class="toast-preview-btn__text">
            <span class="toast-preview-btn__label">{{ button.label }}</span>
            <span class="toast-preview-btn__description">{{ button.description }}</span>
          </span>
        </button>
      </div>
      <p v-if="!settings.enabled" class="toast-panel__preview-disabled text-muted">
        Включите показ уведомлений выше, чтобы проверить примеры.
      </p>
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

  @media (width < $ui-bp-sm) {
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

  @media (width < $ui-bp-sm) {
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
  padding: 1rem;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
}

.toast-panel__preview-header {
  margin-bottom: 0.875rem;
}

.toast-panel__preview-title {
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.toast-panel__preview-hint {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.toast-panel__preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;

  @media (width < $ui-bp-sm) {
    grid-template-columns: 1fr;
  }
}

.toast-preview-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--ui-surface, var(--color-primary-background));
  color: var(--color-primary-text);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--ui-accent, var(--bs-primary));
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.toast-preview-btn__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.375rem;
}

.toast-preview-btn__text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.toast-preview-btn__label {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25;
}

.toast-preview-btn__description {
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--color-secondary-text);
}

.toast-preview-btn--success {
  border-color: color-mix(in srgb, var(--bs-success) 35%, var(--color-border));

  .toast-preview-btn__icon {
    color: var(--bs-success);
    background: color-mix(in srgb, var(--bs-success) 12%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--bs-success) 50%, var(--color-border));
    background: color-mix(in srgb, var(--bs-success) 6%, var(--ui-surface, var(--color-primary-background)));
  }
}

.toast-preview-btn--info {
  border-color: color-mix(in srgb, var(--bs-info) 35%, var(--color-border));

  .toast-preview-btn__icon {
    color: var(--bs-info);
    background: color-mix(in srgb, var(--bs-info) 12%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--bs-info) 50%, var(--color-border));
    background: color-mix(in srgb, var(--bs-info) 6%, var(--ui-surface, var(--color-primary-background)));
  }
}

.toast-preview-btn--warning {
  border-color: color-mix(in srgb, var(--bs-warning) 35%, var(--color-border));

  .toast-preview-btn__icon {
    color: var(--bs-warning);
    background: color-mix(in srgb, var(--bs-warning) 12%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--bs-warning) 50%, var(--color-border));
    background: color-mix(in srgb, var(--bs-warning) 6%, var(--ui-surface, var(--color-primary-background)));
  }
}

.toast-preview-btn--error {
  border-color: color-mix(in srgb, var(--bs-danger) 35%, var(--color-border));

  .toast-preview-btn__icon {
    color: var(--bs-danger);
    background: color-mix(in srgb, var(--bs-danger) 12%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--bs-danger) 50%, var(--color-border));
    background: color-mix(in srgb, var(--bs-danger) 6%, var(--ui-surface, var(--color-primary-background)));
  }
}

.toast-panel__preview-disabled {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
}
</style>
