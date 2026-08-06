<script setup>
import SelectBox from '@/components/SelectBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useUiSettings } from '@/core/cms/js/uiSettings.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { defineAsyncComponent } from 'vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'

const ThemePalettePanel = defineAsyncComponent({
  loader: () => import('./ThemePalettePanel.vue'),
  loadingComponent: SpinnerLoading,
  delay: 80,
})

const { t } = useAppI18n()
const { theme, THEME_OPTIONS } = useUiSettings()
</script>

<template>
  <div class="settings-panel">
    <h1 class="settings-panel__title">{{ t('settings.themes.panelTitle') }}</h1>

    <div class="settings-card">
      <div class="settings-card__row settings-card__row--last">
        <label class="settings-card__label" for="themes-mode">{{ t('settings.themes.mode') }}</label>
        <div class="settings-card__control">
          <SelectBox id="themes-mode" v-model="theme" :options="THEME_OPTIONS" :include-all-option="false">
            <template #selected="{ option, label }">
              <span class="settings-card__option">
                <LucideIcon v-if="option?.icon" :name="option.icon" :size="14" icon-class="settings-card__option-icon" />
                <span class="settings-card__option-label">{{ label }}</span>
              </span>
            </template>
            <template #option="{ option, label }">
              <span class="settings-card__option">
                <LucideIcon v-if="option?.icon" :name="option.icon" :size="14" icon-class="settings-card__option-icon" />
                <span class="settings-card__option-label">{{ label }}</span>
              </span>
            </template>
          </SelectBox>
        </div>
      </div>
    </div>

    <div class="settings-card settings-card--palette">
      <div class="settings-card__row settings-card__row--block settings-card__row--last">
        <ThemePalettePanel />
      </div>
    </div>
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
  margin-bottom: 0.75rem;
}

.settings-card {
  width: 100%;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;

  & + .settings-card {
    margin-top: 0.75rem;
  }
}

.settings-card--palette {
  overflow: visible;
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

.settings-card__row--block {
  display: block;
}

.settings-card__row--last {
  border-bottom: none;
}

.settings-card__label {
  flex: 1 1 auto;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  margin: 0;
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

.settings-card__option {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.settings-card__option-icon {
  flex-shrink: 0;
  width: 14px !important;
  height: 14px !important;
}

.settings-card__option-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
