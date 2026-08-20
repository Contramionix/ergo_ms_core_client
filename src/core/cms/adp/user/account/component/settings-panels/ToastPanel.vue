<script setup>
import { computed } from 'vue'
import { CheckCircle, AlertCircle, AlertTriangle, Info } from '@lucide/vue'
import SelectBox from '@/components/SelectBox.vue'
import SettingsCard from '@/components/SettingsCard.vue'
import SettingsCardRow from '@/components/SettingsCardRow.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { showInfo, showSuccess, showWarning, showError } from '@/js/utils/toast.js'
import { useToastSettings } from '@/js/utils/toastSettings.js'

const { t } = useAppI18n()
const {
  settings,
  TOAST_POSITION_OPTIONS,
  TOAST_DURATION_PRESET_OPTIONS,
  TOAST_MAX_OPTIONS,
} = useToastSettings()

const PREVIEW_BUTTONS = computed(() => [
  {
    type: 'success',
    label: t('settings.toasts.success'),
    description: t('settings.toasts.successDesc'),
    icon: CheckCircle,
    handler: showSuccess,
    message: t('settings.toasts.successSample'),
  },
  {
    type: 'info',
    label: t('settings.toasts.info'),
    description: t('settings.toasts.infoDesc'),
    icon: Info,
    handler: showInfo,
    message: t('settings.toasts.infoSample'),
  },
  {
    type: 'warning',
    label: t('settings.toasts.warning'),
    description: t('settings.toasts.warningDesc'),
    icon: AlertTriangle,
    handler: showWarning,
    message: t('settings.toasts.warningSample'),
  },
  {
    type: 'error',
    label: t('settings.toasts.error'),
    description: t('settings.toasts.errorDesc'),
    icon: AlertCircle,
    handler: showError,
    message: t('settings.toasts.errorSample'),
  },
])

function previewToast(button) {
  button.handler(button.message)
}
</script>

<template>
  <div class="settings-panel">
    <h1 class="settings-panel__title">{{ t('settings.toasts.title') }}</h1>
    <p class="settings-panel__hint text-muted">
      {{ t('settings.toasts.panelHint') }}
    </p>

    <SettingsCard>
      <SettingsCardRow :label="t('settings.toasts.enabled')" :hint="t('settings.toasts.enabledHint')" control-size="auto">
        <div class="form-check form-switch toast-panel__switch">
          <input id="toast-enabled" v-model="settings.enabled" type="checkbox" class="form-check-input" role="switch"/>
        </div>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.toasts.positionLabel')" label-for="toast-position">
        <SelectBox id="toast-position" v-model="settings.position" :options="TOAST_POSITION_OPTIONS" :include-all-option="false" :disabled="!settings.enabled"/>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.toasts.durationLabel')" label-for="toast-duration">
        <SelectBox id="toast-duration" v-model="settings.durationPreset" :options="TOAST_DURATION_PRESET_OPTIONS" :include-all-option="false" :disabled="!settings.enabled"/>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.toasts.maxSimultaneous')" label-for="toast-max">
        <SelectBox id="toast-max" v-model="settings.maxToasts" :options="TOAST_MAX_OPTIONS" :include-all-option="false" cast-to-number :disabled="!settings.enabled"/>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.toasts.pauseOnHover')" :hint="t('settings.toasts.pauseOnHoverHint')" control-size="auto">
        <div class="form-check form-switch toast-panel__switch">
          <input id="toast-pause-hover" v-model="settings.pauseOnHover" type="checkbox" class="form-check-input" role="switch" :disabled="!settings.enabled"/>
        </div>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.toasts.draggable')" :hint="t('settings.toasts.draggableHint')" control-size="auto">
        <div class="form-check form-switch toast-panel__switch">
          <input id="toast-draggable" v-model="settings.draggable" type="checkbox" class="form-check-input" role="switch" :disabled="!settings.enabled"/>
        </div>
      </SettingsCardRow>

      <SettingsCardRow :label="t('settings.toasts.hideProgress')" :hint="t('settings.toasts.hideProgressHint')" control-size="auto" last>
        <div class="form-check form-switch toast-panel__switch">
          <input id="toast-hide-progress" v-model="settings.hideProgressBar" type="checkbox" class="form-check-input" role="switch" :disabled="!settings.enabled"/>
        </div>
      </SettingsCardRow>
    </SettingsCard>

    <section class="toast-panel__preview">
      <div class="toast-panel__preview-header">
        <h2 class="toast-panel__preview-title">{{ t('settings.toasts.previewTitle') }}</h2>
        <p class="toast-panel__preview-hint text-muted">
          {{ t('settings.toasts.previewHint') }}
        </p>
      </div>
      <div class="toast-panel__preview-grid">
        <button v-for="button in PREVIEW_BUTTONS" :key="button.type" type="button" class="toast-preview-btn" :class="`toast-preview-btn--${button.type}`" :disabled="!settings.enabled" @click="previewToast(button)">
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
        {{ t('settings.toasts.previewDisabled') }}
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
  background: var(--color-primary-background);
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
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary-text) 8%, transparent);
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
  background: color-mix(in srgb, var(--bs-success) 6%, var(--color-primary-background));

  .toast-preview-btn__icon {
    color: var(--bs-success);
    background: color-mix(in srgb, var(--bs-success) 12%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--bs-success) 50%, var(--color-border));
    background: color-mix(in srgb, var(--bs-success) 10%, var(--color-primary-background));
  }
}

.toast-preview-btn--info {
  border-color: color-mix(in srgb, var(--bs-info) 35%, var(--color-border));
  background: color-mix(in srgb, var(--bs-info) 6%, var(--color-primary-background));

  .toast-preview-btn__icon {
    color: var(--bs-info);
    background: color-mix(in srgb, var(--bs-info) 12%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--bs-info) 50%, var(--color-border));
    background: color-mix(in srgb, var(--bs-info) 10%, var(--color-primary-background));
  }
}

.toast-preview-btn--warning {
  border-color: color-mix(in srgb, var(--bs-warning) 35%, var(--color-border));
  background: color-mix(in srgb, var(--bs-warning) 6%, var(--color-primary-background));

  .toast-preview-btn__icon {
    color: var(--bs-warning);
    background: color-mix(in srgb, var(--bs-warning) 12%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--bs-warning) 50%, var(--color-border));
    background: color-mix(in srgb, var(--bs-warning) 10%, var(--color-primary-background));
  }
}

.toast-preview-btn--error {
  border-color: color-mix(in srgb, var(--bs-danger) 35%, var(--color-border));
  background: color-mix(in srgb, var(--bs-danger) 6%, var(--color-primary-background));

  .toast-preview-btn__icon {
    color: var(--bs-danger);
    background: color-mix(in srgb, var(--bs-danger) 12%, transparent);
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--bs-danger) 50%, var(--color-border));
    background: color-mix(in srgb, var(--bs-danger) 10%, var(--color-primary-background));
  }
}

.toast-panel__preview-disabled {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
}
</style>