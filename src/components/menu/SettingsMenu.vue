<script setup>
import { Settings, Sun, Moon, LaptopMinimal } from 'lucide-vue-next'
import { ref } from 'vue'
import { useDropdown } from '@/composables/useDropdown.js'

const emit = defineEmits(['dropdown-toggle'])
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)

// Экспортируем метод для внешнего вызова
defineExpose({
  closeDropdown
})

const theme = ref(localStorage.getItem('theme') || 'auto')

const changeTheme = (newTheme) => {
  theme.value = newTheme
  localStorage.setItem('theme', newTheme)

  if (newTheme === 'auto') {
    const clientTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.setAttribute('data-bs-theme', clientTheme)
  } else {
    document.documentElement.setAttribute('data-bs-theme', newTheme)
  }
  
  closeDropdown()
}

const themes = ref([
  { icon: Sun, title: 'Светлая', theme: 'light' },
  { icon: Moon, title: 'Тёмная', theme: 'dark' },
  { icon: LaptopMinimal, title: 'Системная', theme: 'auto' },
])
</script>

<template>
  <div ref="dropdownRef" class="settings-menu-wrapper">
    <div @click.stop="toggleDropdown" class="header-btn" v-tooltip title="Настройки">
      <Settings :size="20" />
    </div>
    <Transition name="dropdown">
      <ul v-if="isOpen" class="settings-dropdown-menu">
      <li class="dropdown-header px-3 py-2 border-bottom"><span class="fw-semibold">Настройки</span></li>
      <li class="dropdown-header px-3 py-1 text-muted small">Тема оформления</li>
      <li v-for="item in themes" :key="item.theme" @click="changeTheme(item.theme)" class="dropdown-item header-dropdown-item" :class="{ active: theme === item.theme }">
        <span class="icon-flex">
          <component :is="item.icon" :size="18" />
        </span>
        <span>{{ item.title }}</span>
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
  min-width: 200px;
}
</style>

<style lang="scss">
// Анимация появления/исчезновения меню SettingsMenu (глобальные стили для Transition)
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

