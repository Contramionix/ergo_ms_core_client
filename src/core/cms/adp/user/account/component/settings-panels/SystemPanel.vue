<script setup>
import SelectBox from '@/components/SelectBox.vue'
import { useUiSettings } from '@/core/cms/js/uiSettings.js'

const {
  theme,
  actionButton,
  language,
  THEME_OPTIONS,
  ACTION_BUTTON_OPTIONS,
  LANGUAGE_OPTIONS,
} = useUiSettings()
</script>

<template>
  <div class="settings-panel">
    <h1 class="settings-panel__title">Система</h1>

    <div class="settings-card">
      <div class="settings-card__row">
        <label class="settings-card__label" for="system-theme">Тема оформления</label>
        <div class="settings-card__control">
          <SelectBox id="system-theme" v-model="theme" :options="THEME_OPTIONS" :include-all-option="false" fixed-trigger-label-font-size uniform-dropdown-list-font>
            <template #selected="{ option, label }">
              <span class="settings-card__option">
                <component v-if="option?.icon" :is="option.icon" class="settings-card__option-icon" />
                <span class="settings-card__option-label">{{ label }}</span>
              </span>
            </template>
            <template #option="{ option, label }">
              <span class="settings-card__option">
                <component v-if="option?.icon" :is="option.icon" class="settings-card__option-icon" />
                <span class="settings-card__option-label">{{ label }}</span>
              </span>
            </template>
          </SelectBox>
        </div>
      </div>

      <div class="settings-card__row">
        <label class="settings-card__label" for="system-action-button">Кнопка действия</label>
        <div class="settings-card__control">
          <SelectBox id="system-action-button" v-model="actionButton" :options="ACTION_BUTTON_OPTIONS" :include-all-option="false" fixed-trigger-label-font-size uniform-dropdown-list-font>
            <template #selected="{ option, label }">
              <span class="settings-card__option">
                <component v-if="option?.icon" :is="option.icon" class="settings-card__option-icon" />
                <span class="settings-card__option-label">{{ label }}</span>
              </span>
            </template>
            <template #option="{ option, label }">
              <span class="settings-card__option">
                <component v-if="option?.icon" :is="option.icon" class="settings-card__option-icon" />
                <span class="settings-card__option-label">{{ label }}</span>
              </span>
            </template>
          </SelectBox>
        </div>
      </div>

      <div class="settings-card__row settings-card__row--last">
        <label class="settings-card__label" for="system-language">Язык интерфейса</label>
        <div class="settings-card__control">
          <SelectBox id="system-language" v-model="language" :options="LANGUAGE_OPTIONS" :include-all-option="false" fixed-trigger-label-font-size uniform-dropdown-list-font disabled>
            <template #selected="{ option, label }">
              <span class="settings-card__option">
                <component v-if="option?.icon" :is="option.icon" class="settings-card__option-icon" />
                <span class="settings-card__option-label">{{ label }}</span>
              </span>
            </template>
            <template #option="{ option, label }">
              <span class="settings-card__option">
                <component v-if="option?.icon" :is="option.icon" class="settings-card__option-icon" />
                <span class="settings-card__option-label">{{ label }}</span>
              </span>
            </template>
          </SelectBox>
        </div>
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

  @media (max-width: 575.98px) {
    width: 100%;
  }

  :deep(.select-trigger) {
    min-height: 30px;
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
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
