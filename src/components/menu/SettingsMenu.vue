<script setup>
import { Settings, Sun, Moon, LaptopMinimal } from 'lucide-vue-next'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Dropdown } from 'bootstrap/dist/js/bootstrap.bundle.min.js'

const emit = defineEmits(['dropdown-toggle'])
const router = useRouter()
const dropdownRef = ref(null)
const theme = ref(localStorage.getItem('theme') || 'auto')

// Изменение темы
const changeTheme = (newTheme) => {
  theme.value = newTheme
  localStorage.setItem('theme', newTheme)

  if (newTheme === 'auto') {
    const clientTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.setAttribute('data-bs-theme', clientTheme)
  } else {
    document.documentElement.setAttribute('data-bs-theme', newTheme)
  }
  
  // Закрываем dropdown после выбора
  if (dropdownRef.value) {
    const dropdownElement = dropdownRef.value.querySelector('[data-bs-toggle="dropdown"]')
    if (dropdownElement) {
      const bsDropdown = Dropdown.getInstance(dropdownElement)
      if (bsDropdown) {
        bsDropdown.hide()
      }
    }
  }
}

// Список тем
const themes = ref([
  { icon: Sun, title: 'Светлая', theme: 'light' },
  { icon: Moon, title: 'Тёмная', theme: 'dark' },
  { icon: LaptopMinimal, title: 'Системная', theme: 'auto' },
])

const goToSettings = () => {
  router.push({ name: 'Settings' })
  // Закрываем dropdown
  if (dropdownRef.value) {
    const dropdownElement = dropdownRef.value.querySelector('[data-bs-toggle="dropdown"]')
    if (dropdownElement) {
      const bsDropdown = Dropdown.getInstance(dropdownElement)
      if (bsDropdown) {
        bsDropdown.hide()
      }
    }
  }
}

onMounted(() => {
  if (dropdownRef.value) {
    const dropdownElement = dropdownRef.value.querySelector('[data-bs-toggle="dropdown"]')
    if (dropdownElement) {
      dropdownElement.addEventListener('show.bs.dropdown', () => {
        emit('dropdown-toggle', true)
      })
      
      dropdownElement.addEventListener('hide.bs.dropdown', () => {
        emit('dropdown-toggle', false)
      })
    }
  }
})
</script>

<template>
  <div ref="dropdownRef" class="dropdown-center header-dropdown-center">
    <div data-bs-toggle="dropdown" aria-expanded="false" data-bs-offset="0,20">
      <div class="header-btn" v-tooltip title="Настройки">
        <Settings :size="20" />
      </div>
    </div>
    <ul class="dropdown-menu header-dropdown-menu">
      <li class="dropdown-header px-3 py-2 border-bottom">
        <span class="fw-semibold">Настройки</span>
      </li>
      
      <!-- Настройка темы -->
      <li class="dropdown-header px-3 py-1 text-muted small">
        Тема оформления
      </li>
      <li
        v-for="(item, index) in themes"
        :key="index"
        @click="changeTheme(item.theme)"
        class="dropdown-item header-dropdown-item"
        :class="{ active: theme === item.theme }"
        :style="{ transitionDelay: `${index * 50}ms` }"
      >
        <span class="icon-flex">
          <component :is="item.icon" :size="18" />
        </span>
        <span>{{ item.title }}</span>
      </li>
      
      <li><hr class="dropdown-divider" /></li>
      
      <!-- Обычные настройки -->
      <li @click="goToSettings" class="dropdown-item header-dropdown-item">
        <span class="icon-flex">
          <Settings :size="18" />
        </span>
        <span>Настройки</span>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss"></style>

