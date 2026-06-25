<script setup>
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { onMounted, onBeforeUnmount, provide, ref, watch } from 'vue'
import { ChevronLeft, Cog, Minus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useToast } from 'vue-toastification'

import {
  getUserMenu,
  transformMenuData,
  transformSeparators,
  shouldShowSeparatorAt,
  getSeparatorTextAt
} from '@/core/cms/js/menuService.js'

import MenuGroup from '@/components/menu/MenuGroup.vue'
import MenuToolbar from '@/components/menu/MenuToolbar.vue'

import { useMenuWidth } from './composables/useMenuWidth'
import { useMenuNavigation } from './composables/useMenuNavigation'
import { useMenuIconSizes, MENU_ICON_SIZES_KEY } from './composables/useMenuIconSizes'

const props = defineProps({
  isVisible: Boolean,
})

const emit = defineEmits(['left-padding', 'menu-state-change'])

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// Состояние меню
const isCollapsed = ref(false)
const isHovering = ref(true)
const isToolbarDropdownActive = ref(false)
const menuSections = ref([])
const siteName = ref('...')

// Конфигурация разделителей из API
const separatorsConfig = ref({ byOrderIndex: {} })

const getSeparator = (index) => getSeparatorTextAt(index, separatorsConfig.value)
const shouldShowSeparator = (index) => shouldShowSeparatorAt(index, separatorsConfig.value)

// Composables
const {
  menuWidth,
  updateMenuWidth,
  initializeMenuWidth,
  setupWidthTracking
} = useMenuWidth()

const { menuIconSizes } = useMenuIconSizes()
provide(MENU_ICON_SIZES_KEY, menuIconSizes)

// Helper функция для вызова updateMenuWidth с текущими параметрами
const updateWidth = () => {
  updateMenuWidth(
    menuSections.value,
    siteName.value,
    userStore,
    getSeparator,
    shouldShowSeparator,
    emit,
    isCollapsed.value
  )
}

const {
  openGroupRouteName,
  nestedOpenStates,
  toggleGroup,
  toggleNestedGroup
} = useMenuNavigation(menuSections)

// Watch для видимости меню
watch(
  () => props.isVisible,
  (newValue) => {
    if (!newValue) {
      isHovering.value = true
    } else {
      initializeMenuWidth(
        menuSections.value,
        siteName.value,
        userStore,
        getSeparator,
        shouldShowSeparator,
        emit,
        isCollapsed.value
      )
      setTimeout(updateWidth, 50)
    }
  }
)

// Немедленно рассчитываем начальную ширину
if (typeof window !== 'undefined') {
  setTimeout(updateWidth, 0)
}

// Переключение меню
const toggleMenu = () => {
  isCollapsed.value = !isCollapsed.value
  const padding = isCollapsed.value ? '120px' : `${menuWidth.value + 40}px`
  emit('left-padding', padding)
  emit('menu-state-change', isCollapsed.value, menuWidth.value)
}

// Обработка наведения
const handleMouseEnter = () => {
  if (isCollapsed.value) isHovering.value = true
}

const handleMouseLeave = () => {
  if (isCollapsed.value && !isToolbarDropdownActive.value) {
    isHovering.value = false
  }
}

// Управление состоянием тулбара
const setToolbarDropdownActive = (active) => {
  isToolbarDropdownActive.value = active
  if (active && isCollapsed.value) {
    isHovering.value = true
  }
}

const handleNavigate = (item) => {
  const externalUrl = item.externalUrl || item.external_url
  if (item.item_type === 'external' && externalUrl) {
    window.open(externalUrl, '_blank', 'noopener,noreferrer')
    return
  }

  if (item.routeName) {
    router.push({ name: item.routeName })
    return
  }

  if (item.path) {
    router.push({ name: item.path })
  }
}

// Следим за изменениями в меню
watch(menuSections, updateWidth, { deep: true })
watch(siteName, updateWidth)

// Следим за изменениями имени пользователя (только имя, не весь объект)
watch(() => userStore.fullName, (newName, oldName) => {
  // Обновляем ширину меню только если изменилось имя
  if (oldName !== newName && newName) {
    if (isCollapsed.value) {
      isHovering.value = true
      setTimeout(updateWidth, 100)
    } else {
      updateWidth()
    }
  }
})

// Загрузка меню из API
const loadMenu = async (forceRefresh = false) => {
  const resetMenu = () => {
    menuSections.value = []
    separatorsConfig.value = { byOrderIndex: {} }
  }

  try {
    const menuData = await getUserMenu(forceRefresh)
    
    if (menuData?.menu_items?.length > 0) {
      menuSections.value = transformMenuData(menuData)
      separatorsConfig.value = transformSeparators(menuData.separators || [], menuData.menu_items)
      return
    }
    
    resetMenu()
    toast.warning('Меню пока не настроено. Обратитесь к администратору.')
  } catch (error) {
    resetMenu()
    toast.error('Не удалось загрузить меню. Попробуйте обновить страницу.')
    console.error('Ошибка загрузки меню:', error)
  }
}

// Слушаем событие обновления меню
const handleMenuUpdate = () => loadMenu(true)

// Инициализация при монтировании
onMounted(async () => {
  // Загружаем меню (из API или статический конфиг)
  await loadMenu()

  // Слушаем событие обновления меню
  window.addEventListener('menu-updated', handleMenuUpdate)

  // Загружаем название сайта
  try {
    const res = await apiClient.get(endpoints.settings.siteName)
    if (res.success) {
      siteName.value = res.data?.site_name || 'ERGOMS'
    }
  } catch {
    siteName.value = 'ERGOMS'
  }

  // Рассчитываем оптимальную ширину
  initializeMenuWidth(
    menuSections.value,
    siteName.value,
    userStore,
    getSeparator,
    shouldShowSeparator,
    emit,
    isCollapsed.value
  )

  // Настраиваем отслеживание изменений ширины
  setupWidthTracking(updateWidth)
  setTimeout(() => setupWidthTracking(updateWidth), 500)
})

// Удаляем слушатель при размонтировании
onBeforeUnmount(() => {
  window.removeEventListener('menu-updated', handleMenuUpdate)
})
</script>

<template>
  <aside
    class="side-menu card p-0"
    :class="{ collapsed: isCollapsed, hovering: isHovering, 'is-hidden': !isVisible }"
    :style="{ '--menu-width': `${menuWidth}px` }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="side-menu__header side-header">
      <RouterLink to="/" class="side-menu__logo">
        <div class="side-header__icon" aria-hidden="true">
          <Cog :size="32" />
        </div>
        <div class="side-header__title text-smooth-animation" :class="{ hidden: !isHovering }">
          {{ siteName }}
        </div>
      </RouterLink>
      <div class="side-menu__toggle">
        <button @click="toggleMenu" class="btn btn-primary">
          <ChevronLeft
            :class="{ rotated: isCollapsed }"
            :size="menuIconSizes.toggle"
            class="menu-group__chevron"
          />
        </button>
      </div>
    </div>
    <div class="side-header__shadow" style="display: block"></div>
    <div class="side-menu__body">
      <div class="side-menu__scroll">
        <ul class="side-menu__list p-2" :class="{ short: !isHovering }">
        <li v-for="(section, index) in menuSections" :key="index">
          <div v-if="shouldShowSeparator(index)" class="side-menu__divider side-divider py-2">
            <div class="side-divider__icon"><Minus :size="menuIconSizes.divider" /></div>
            <div class="side-divider__name text-smooth-animation" :class="{ hidden: !isHovering }">
              {{ getSeparator(index) }}
            </div>
          </div>
          
          <MenuGroup
            :is-hovering="isHovering"
            :is-collapsed="!isCollapsed"
            :is-open="openGroupRouteName === section.routeName"
            :data="section"
            :nested-open-states="nestedOpenStates"
            @toggle="toggleGroup(section.routeName)"
            @navigate="handleNavigate"
            @toggle-nested="toggleNestedGroup"
          />
        </li>
        </ul>
      </div>
      <MenuToolbar
        :is-collapsed="isCollapsed"
        :is-hovering="isHovering"
        @dropdown-state-change="setToolbarDropdownActive"
      />
    </div>
  </aside>
</template>

<style lang="scss" scoped>
// Меню
.side-menu__logo {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  min-width: 0;
}

.side-menu__body {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  font-size: 0.875rem;
}

.side-menu {
  position: fixed;
  display: flex;
  flex-direction: column;
  inline-size: var(--menu-width, 260px);
  padding: $padding-external;
  height: 100dvh;
  transform: translateX(0);
  z-index: 1005;
  transition: all $transition;

  &.is-hidden {
    transform: translateX(-110%);
  }

  &.collapsed {
    width: 84px;
  }

  &.hovering {
    width: var(--menu-width, 260px);
  }
}

// Область прокрутки списка меню
.side-menu__scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(34, 48, 62, 0.4) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(34, 48, 62, 0.4);
    border-radius: 10rem;

    &:hover {
      background: rgba(34, 48, 62, 0.6);
    }

    &:active {
      background: rgba(34, 48, 62, 0.7);
    }
  }
}

[data-bs-theme='dark'] .side-menu__scroll {
  scrollbar-color: rgba(255, 255, 255, 0.44) transparent;

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.44);

    &:hover {
      background: rgba(255, 255, 255, 0.6);
    }

    &:active {
      background: rgba(255, 255, 255, 0.7);
    }
  }
}

// Шапка меню
.side-header {
  position: relative;
  padding: 15px 0 15px 26px;

  a {
    @include flex-row-gap($padding-internal, center);
    text-decoration: none;
  }
}

// Тень
.side-header__shadow {
  position: absolute;
  top: 3.3125rem;
  width: 100%;
  height: 2rem;
  background: linear-gradient(var(--bs-card-bg) 41%, rgba(255, 255, 255, 0));
  pointer-events: none;
  z-index: 2;
  transition: background $transition;
}

// Иконка логотипа (фиксированный размер, не от компактного font-size тела меню)
.side-header__icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  color: var(--color-primary-text);
  display: flex;
  align-items: center;
  justify-content: center;
}

// Заголовок
.side-header__title {
  flex-grow: 1;
  color: var(--color-primary-text);
  font-size: $font-size-h1;
  font-weight: bold;
  white-space: nowrap;
  text-overflow: ellipsis;
  user-select: none;
  overflow: hidden;
}

// Кнопка переключения
.side-menu__toggle {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translate(50%, -50%);
  cursor: pointer;
  border: 6px solid var(--bs-body-bg);
  border-radius: 50%;
  transition: border 0.5s ease;

  button {
    @include flex-row-gap(0, center, center);
    border-radius: 50%;
    height: 26px;
    width: 26px;
    padding: 0;
  }
}

// Анимация иконки
.menu-group__chevron {
  transition: transform 0.3s ease;

  &.rotated {
    transform: rotate(180deg);
  }
}

// Список меню
.side-menu__list {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
  margin: 0;
  min-height: min-content;

  &.short {
    overflow: hidden;
  }
}

// Разделитель
.side-divider {
  @include flex-row-gap($padding-internal, center);
  padding: $padding-internal $padding-external;
  overflow: hidden;

  &__icon {
    flex-shrink: 0;
  }

  &__name,
  &__icon {
    user-select: none;
    color: var(--color-secondary-text);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__name {
    overflow: hidden;
    flex: 1;
    min-width: 0;
  }
}
</style>