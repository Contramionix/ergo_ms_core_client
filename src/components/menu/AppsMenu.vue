<script setup>
import { Grid3x3, BarChart3 } from 'lucide-vue-next'
import { ref, onMounted, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { Dropdown } from 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { moduleManager } from '@/modules/index.js'
import { biAnalysisService } from '@/core/bi/js/biAnalysisService.js'

const emit = defineEmits(['dropdown-toggle'])
const router = useRouter()
const dropdownRef = ref(null)
const apps = ref([])
const isLoading = ref(true)

// Загрузка списка приложений
const loadApps = async () => {
  try {
    isLoading.value = true
    
    // Инициализируем moduleManager если нужно
    if (!moduleManager.initialized) {
      await moduleManager.initialize()
    }
    
    // Получаем конфигурацию меню из ModuleManager
    const menuManager = moduleManager.getMenuManager()
    await menuManager.initialize()
    const menuConfig = menuManager.generateMenuConfig()
    
    // Получаем IconManager для получения иконок
    const iconManager = moduleManager.getIconManager()
    
    // Извлекаем секции меню
    const menuSections = menuConfig.menuSections || []
    
    // Преобразуем в формат для отображения
    apps.value = menuSections
      .filter(section => section.routeName) // Только секции с роутами
      .map(section => {
        // Получаем иконку из IconManager
        const IconComponent = section.icon ? iconManager.getIcon(section.icon) : null
        
        return {
          name: section.routeName,
          title: section.title || section.name || section.routeName,
          icon: IconComponent,
          iconName: section.icon,
          route: { name: section.routeName },
          isBI: section.routeName === 'BI'
        }
      })
    
    // Всегда добавляем BI, если его нет в списке
    const hasBI = apps.value.some(app => app.name === 'BI')
    if (!hasBI) {
      // Пробуем получить иконку из IconManager, если не получается - используем BarChart3
      let IconComponent = iconManager.getIcon('ChartSpline') || iconManager.getIcon('BarChart3')
      if (!IconComponent) {
        IconComponent = BarChart3
      }
      apps.value.unshift({
        name: 'BI',
        title: 'BI',
        icon: IconComponent,
        iconName: 'ChartSpline',
        route: { name: 'BI' },
        isBI: true
      })
    } else {
      // Обновляем иконку для BI, если она не загрузилась
      const biApp = apps.value.find(app => app.name === 'BI')
      if (biApp && !biApp.icon) {
        let IconComponent = iconManager.getIcon('ChartSpline') || iconManager.getIcon('BarChart3')
        if (!IconComponent) {
          IconComponent = BarChart3
        }
        biApp.icon = IconComponent
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки приложений:', error)
    // Добавляем BI как fallback с иконкой
    apps.value = [
      {
        name: 'BI',
        title: 'BI',
        icon: BarChart3,
        iconName: 'BarChart3',
        route: { name: 'BI' },
        isBI: true
      }
    ]
  } finally {
    isLoading.value = false
  }
}

const goToApp = (app) => {
  // Если это BI, открываем модальное окно
  if (app.isBI) {
    biAnalysisService.toggle()
  } else {
    router.push(app.route)
  }
  
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

onMounted(async () => {
  await loadApps()
  
  // Инициализируем Bootstrap dropdown
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
      <div class="header-btn" v-tooltip title="Приложения">
        <Grid3x3 :size="20" />
      </div>
    </div>
    <ul class="dropdown-menu header-dropdown-menu apps-menu">
      <li v-if="isLoading" class="apps-menu__loading">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </li>
      <li v-else-if="apps.length === 0" class="apps-menu__empty text-muted text-center py-3">
        Нет доступных приложений
      </li>
      <li v-else class="apps-menu__container">
        <div class="apps-menu__grid">
          <div
            v-for="(app, index) in apps"
            :key="app.name"
            @click="goToApp(app)"
            class="apps-menu__item"
            :title="app.title"
            :style="{ transitionDelay: `${index * 30}ms` }"
          >
            <div class="apps-menu__icon">
              <component v-if="app.icon" :is="app.icon" :size="32" />
              <div v-else class="apps-menu__icon-placeholder">{{ app.title.charAt(0) }}</div>
            </div>
            <div class="apps-menu__title">{{ app.title }}</div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.apps-menu {
  padding: 1rem;
  min-width: 280px;
  max-width: 400px;
  list-style: none;
}

.apps-menu__loading,
.apps-menu__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  list-style: none;
}

.apps-menu__container {
  list-style: none;
  padding: 0;
  margin: 0;
}

.apps-menu__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.apps-menu__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 90px;

  &:hover {
    background-color: var(--color-hover-background);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}

.apps-menu__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 0.5rem;
  color: var(--color-primary-text);
  border: 2px solid var(--color-border, #dee2e6);
  border-radius: 8px;
  background-color: var(--color-secondary-background, #f8f9fa);
  padding: 8px;
}

.apps-menu__icon-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: var(--color-secondary-background);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
  color: var(--color-primary-text);
}

.apps-menu__title {
  font-size: 0.75rem;
  color: var(--color-primary-text);
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
  font-weight: 500;
  
  // Для BI делаем жирнее и цветным
  &.apps-menu__title--bi {
    font-weight: 700;
    color: var(--bs-primary, #0d6efd);
  }
}
</style>

