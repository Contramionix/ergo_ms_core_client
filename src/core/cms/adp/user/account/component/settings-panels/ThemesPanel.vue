<script setup>
import SelectBox from '@/components/SelectBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import SettingsCard from '@/components/SettingsCard.vue'
import SettingsCardRow from '@/components/SettingsCardRow.vue'
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

    <SettingsCard>
      <SettingsCardRow :label="t('settings.themes.mode')" label-for="themes-mode" last>
        <SelectBox id="themes-mode" v-model="theme" :options="THEME_OPTIONS" :include-all-option="false">
          <template #selected="{ option, label }">
            <span class="settings-panel__option">
              <LucideIcon v-if="option?.icon" :name="option.icon" :size="14" icon-class="settings-panel__option-icon" />
              <span class="settings-panel__option-label">{{ label }}</span>
            </span>
          </template>
          <template #option="{ option, label }">
            <span class="settings-panel__option">
              <LucideIcon v-if="option?.icon" :name="option.icon" :size="14" icon-class="settings-panel__option-icon" />
              <span class="settings-panel__option-label">{{ label }}</span>
            </span>
          </template>
        </SelectBox>
      </SettingsCardRow>
    </SettingsCard>

    <SettingsCard overflow-visible>
      <SettingsCardRow block last>
        <ThemePalettePanel />
      </SettingsCardRow>
    </SettingsCard>
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

.settings-panel__option {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.settings-panel__option-icon {
  flex-shrink: 0;
  width: 14px !important;
  height: 14px !important;
}

.settings-panel__option-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>