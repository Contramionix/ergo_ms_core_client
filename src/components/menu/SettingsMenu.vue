<script setup>
import { Settings, Cog, Contrast, ChevronRight, Sun, Moon, LaptopMinimal, Check, } from 'lucide-vue-next'
import { ref, computed, watch } from 'vue'
import { useDropdown } from '@/composables/useDropdown.js'
import { useUiSettings } from '@/core/cms/js/uiSettings.js'

const emit = defineEmits(['dropdown-toggle', 'openUserSettings'])
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)

defineExpose({
  closeDropdown,
})

const { theme } = useUiSettings()
const appearanceHovered = ref(false)
const appearanceMenuOpen = ref(false)

const themes = [
  { icon: Sun, title: 'Светлая', theme: 'light' },
  { icon: Moon, title: 'Тёмная', theme: 'dark' },
  { icon: LaptopMinimal, title: 'Системная', theme: 'auto' },
]

const currentThemeTitle = computed(() => {
  const found = themes.find((t) => t.theme === theme.value)
  return found?.title ?? ''
})

const showAppearanceSubmenu = computed(
  () => appearanceHovered.value || appearanceMenuOpen.value,
)

const changeTheme = (newTheme) => {
  if (theme.value === newTheme) {
    return
  }
  theme.value = newTheme
  appearanceMenuOpen.value = false
  closeDropdown()
}

function openUserSettings() {
  closeDropdown()
  emit('openUserSettings')
}

function toggleAppearanceTouch(event) {
  event.stopPropagation()
  appearanceMenuOpen.value = !appearanceMenuOpen.value
}

watch(isOpen, (open) => {
  if (!open) {
    appearanceMenuOpen.value = false
    appearanceHovered.value = false
  }
})
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
        <li class="settings-menu__appearance" @mouseenter="appearanceHovered = true" @mouseleave="appearanceHovered = false">
          <button type="button" class="dropdown-item header-dropdown-item settings-menu__appearance-trigger w-100 text-start" :class="{ 'settings-menu__appearance-trigger--submenu-open': showAppearanceSubmenu }" @click.stop="toggleAppearanceTouch">
            <span class="icon-flex settings-menu__item-icon">
              <Contrast :size="18" />
            </span>
            <span class="settings-menu__main-text settings-menu__appearance-label text-truncate">Тема</span>
            <span class="settings-menu__appearance-value text-muted text-truncate">{{ currentThemeTitle }}</span>
            <ChevronRight class="settings-menu__appearance-chevron flex-shrink-0" :size="16" />
          </button>
          <Transition name="submenu-fade">
            <ul v-if="showAppearanceSubmenu" class="settings-menu__submenu">
              <li v-for="item in themes" :key="item.theme">
                <button type="button" class="dropdown-item header-dropdown-item settings-menu__submenu-item w-100 text-start" :class="{ active: theme === item.theme }" @click.stop="changeTheme(item.theme)">
                  <span class="icon-flex settings-menu__submenu-icon">
                    <component :is="item.icon" :size="15" />
                  </span>
                  <span class="flex-grow-1 settings-menu__submenu-label">{{ item.title }}</span>
                  <Check v-if="theme === item.theme" class="flex-shrink-0 ms-1" :size="14" />
                </button>
              </li>
            </ul>
          </Transition>
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
  min-width: 260px;
}

.settings-menu__appearance {
  position: relative;
  list-style: none;
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

.settings-menu__appearance-trigger {
  display: grid !important;
  grid-template-columns: 18px 1fr auto auto;
  align-items: center;
  column-gap: 12px;
}

.settings-menu__appearance-trigger--submenu-open {
  background-color: var(--bs-secondary-bg);
}

.settings-menu__appearance-label {
  grid-column: 2;
  min-width: 0;
}

.settings-menu__appearance-value {
  grid-column: 3;
  font-size: 0.8125rem;
  max-width: 5.5rem;
}

.settings-menu__appearance-chevron {
  grid-column: 4;
  opacity: 0.75;
}

.settings-menu__submenu {
  position: absolute;
  left: calc(100% - 8px);
  top: 0;
  z-index: 1010;
  min-width: 10.25rem;
  margin: 0;
  padding: 0.3rem 0;
  list-style: none;
  background-color: var(--bs-card-bg);
  box-shadow: 0 0.25rem 0.75rem 0 rgba(34, 48, 62, 0.14);
  border-radius: 0.375rem;
}

.settings-menu__submenu-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.35rem 0.75rem !important;
  font-size: 0.8125rem;
  line-height: 1.25;
}

.settings-menu__submenu-icon :deep(svg) {
  vertical-align: middle;
}

.settings-menu__submenu-label {
  font-size: inherit;
}

.submenu-fade-enter-active,
.submenu-fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.submenu-fade-enter-from,
.submenu-fade-leave-to {
  opacity: 0;
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
</style>