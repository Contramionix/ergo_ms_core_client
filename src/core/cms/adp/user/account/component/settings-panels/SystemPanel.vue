<script setup>
import SelectBox from '@/components/SelectBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import SettingsCard from '@/components/SettingsCard.vue'
import SettingsCardRow from '@/components/SettingsCardRow.vue'
import { useUiSettings } from '@/core/cms/js/uiSettings.js'
import { useUiPreferencesSettings } from '@/core/cms/js/uiPreferencesSettings.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const {
  language,
  LANGUAGE_OPTIONS,
} = useUiSettings()

const {
  motion,
  images,
  contrast,
  a11y,
  MOTION_OPTIONS,
  IMAGES_OPTIONS,
  CONTRAST_OPTIONS,
  A11Y_OPTIONS,
} = useUiPreferencesSettings()
</script>

<template>
  <div class="settings-panel">
    <h1 class="settings-panel__title">{{ t('settings.system.title') }}</h1>

    <SettingsCard>
      <SettingsCardRow :label="t('settings.system.language')" label-for="system-language">
        <SelectBox id="system-language" v-model="language" :options="LANGUAGE_OPTIONS" :include-all-option="false">
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

      <SettingsCardRow :label="t('settings.system.motion')" label-for="system-motion">
        <SelectBox id="system-motion" v-model="motion" :options="MOTION_OPTIONS" :include-all-option="false">
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

      <SettingsCardRow :label="t('settings.system.images')" label-for="system-images">
        <SelectBox id="system-images" v-model="images" :options="IMAGES_OPTIONS" :include-all-option="false">
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

      <SettingsCardRow :label="t('settings.system.contrast')" label-for="system-contrast">
        <SelectBox id="system-contrast" v-model="contrast" :options="CONTRAST_OPTIONS" :include-all-option="false">
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

      <SettingsCardRow :label="t('settings.system.a11y')" label-for="system-a11y" last>
        <SelectBox id="system-a11y" v-model="a11y" :options="A11Y_OPTIONS" :include-all-option="false">
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