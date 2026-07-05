<script setup>
import { Settings, Cog, Contrast, ChevronRight } from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import { useDropdown } from '@/composables/useDropdown.js'
import { useUiSettings } from '@/core/cms/js/uiSettings.js'

const emit = defineEmits(['dropdown-toggle', 'openUserSettings'])
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)

defineExpose({
  closeDropdown,
})

const { theme, THEME_OPTIONS } = useUiSettings()

function openUserSettings() {
  closeDropdown()
  emit('openUserSettings')
}
</script>

<template>
  <div ref="dropdownRef" class="settings-menu-wrapper">
    <div @click.stop="toggleDropdown" class="header-btn" v-tooltip title="Настройки">
      <Settings :size="20" />
    </div>
    <Transition name="dropdown">
      <ul v-if="isOpen" class="settings-dropdown-menu">
        <li>
          <button type="button" class="dropdown-item header-dropdown-item settings-menu__item-row settings-menu__item-row--settings w-100 text-start" @click.stop="openUserSettings">
            <span class="icon-flex settings-menu__item-icon">
              <Cog :size="18" />
            </span>
            <span class="settings-menu__main-text">Настройки</span>
          </button>
        </li>
        <li class="settings-menu__theme">
          <SelectBox
            v-model="theme"
            :options="THEME_OPTIONS"
            :include-all-option="false" open-on-hover
            placement="right"
            :placement-gap="0"
            placement-align="center"
            hide-chevron
            :dropdown-min-width="200"
            dropdown-menu-class="settings-menu__theme-menu"
            class="settings-menu__theme-select"
          >
            <template #selected="{ label }">
              <span class="settings-menu__theme-trigger">
                <span class="icon-flex settings-menu__item-icon">
                  <Contrast :size="18" />
                </span>
                <span class="settings-menu__main-text settings-menu__theme-label text-truncate">Тема</span>
                <span class="settings-menu__theme-value text-muted text-truncate">{{ label }}</span>
                <ChevronRight class="settings-menu__theme-chevron flex-shrink-0" :size="16" />
              </span>
            </template>
            <template #option="{ option, label }">
              <span class="settings-menu__option">
                <component v-if="option?.icon" :is="option.icon" class="settings-menu__option-icon" :size="15" />
                <span class="settings-menu__option-label">{{ label }}</span>
              </span>
            </template>
          </SelectBox>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.settings-menu-wrapper {
  position: relative;
  display: inline-block;
}

.settings-dropdown-menu {
  @include dropdown-menu-base;
  left: 50%;
  transform: translate(-50%, -8px);
  min-width: 220px;
}

.settings-menu__main-text {
  font-size: 0.9375rem;
  line-height: 1.4;
}

.settings-menu__item-icon {
  display: inline-flex;
  width: 18px;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
}

.settings-menu__item-row--settings {
  display: grid !important;
  grid-template-columns: 18px 1fr;
  align-items: center;
  column-gap: 12px;
}

.settings-menu__theme {
  list-style: none;
}

// SelectBox стилизуем под обычный пункт меню (как было: строка «Тема … значение ›»).
.settings-menu__theme-select {
  width: 100%;
  --select-box-font-size: 0.9375rem;
}

.settings-menu__theme-select :deep(.select-trigger) {
  background-color: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  min-height: 0;
  padding: 0.5rem 1rem;
  color: inherit;
}

.settings-menu__theme-select :deep(.select-trigger:hover),
.settings-menu__theme-select :deep(.select-trigger--open) {
  background-color: var(--bs-secondary-bg);
}

.settings-menu__theme-select :deep(.select-trigger:active:not(:disabled)) {
  transform: none;
}

.settings-menu__theme-trigger {
  display: grid;
  grid-template-columns: 18px 1fr auto auto;
  align-items: center;
  column-gap: 12px;
  width: 100%;
  min-width: 0;
}

.settings-menu__theme-label {
  min-width: 0;
}

.settings-menu__theme-value {
  font-size: 0.8125rem;
  max-width: 5.5rem;
}

.settings-menu__theme-chevron {
  opacity: 0.75;
}

.settings-menu__option {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.settings-menu__option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<style lang="scss">
.settings-dropdown-menu.dropdown-enter-active,
.settings-dropdown-menu.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.settings-dropdown-menu.dropdown-enter-from {
  opacity: 0;
  transform: translate(-50%, -16px) !important;
}

.settings-dropdown-menu.dropdown-enter-to {
  opacity: 1;
  transform: translate(-50%, -8px) !important;
}

.settings-dropdown-menu.dropdown-leave-from {
  opacity: 1;
  transform: translate(-50%, -8px) !important;
}

.settings-dropdown-menu.dropdown-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px) !important;
}

// Меню SelectBox темы телепортируется в body — стилизуем глобально по классу.
.settings-menu__theme-menu {
  min-width: 12.5rem;
}

.settings-menu__theme-menu .dropdown-item {
  padding-right: 1.5rem;
}
</style>
