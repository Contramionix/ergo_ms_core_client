<script setup>
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { onMounted, ref, watch } from 'vue'
import { ChevronLeft, Cog, Minus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useUserStore } from '@/core/cms/js/userStore.js'

import {
  allMenuSections,
  getSeparator,
  shouldShowSeparator,
  AdminPanelMenuSection
} from '@/js/menu-sections.js'

import MenuGroup from '@/components/menu/MenuGroup.vue'
import MenuToolbar from '@/components/menu/MenuToolbar.vue'

import { useMenuWidth } from './composables/useMenuWidth'
import { useMenuNavigation } from './composables/useMenuNavigation'
import { filterMenuByPermissions } from './utils/menuPermissions'

const props = defineProps({
  isVisible: Boolean,
  currentPage: String
})

const emit = defineEmits(['left-padding', 'open-datasets', 'open-sidebar', 'reset-page', 'menu-state-change'])

const router = useRouter()
const userStore = useUserStore()

// Состояние меню
const isCollapsed = ref(false)
const isHovering = ref(true)
const isToolbarDropdownActive = ref(false)
const menuSections = ref([...allMenuSections])
const siteName = ref('...')

// Composables
const {
  menuWidth,
  updateMenuWidth,
  initializeMenuWidth,
  setupWidthTracking
} = useMenuWidth()

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
      const initFn = () => initializeMenuWidth(
        menuSections.value,
        siteName.value,
        userStore,
        getSeparator,
        shouldShowSeparator,
        emit,
        isCollapsed.value
      )
      initFn()
      setTimeout(() => {
        const updateFn = () => updateMenuWidth(
          menuSections.value,
          siteName.value,
          userStore,
          getSeparator,
          shouldShowSeparator,
          emit,
          isCollapsed.value
        )
        updateFn()
      }, 50)
    }
  }
)

// Немедленно рассчитываем начальную ширину
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const updateFn = () => updateMenuWidth(
      menuSections.value,
      siteName.value,
      userStore,
      getSeparator,
      shouldShowSeparator,
      emit,
      isCollapsed.value
    )
    updateFn()
  }, 0)
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

// Обработчики действий
function handleAction(action) {
  if (action === 'openDatasetSidebar') {
    emit('open-datasets')
  }
}

function handleNavigate(item) {
  if (['datasets', 'connections', 'charts', 'dashboards'].includes(item.page)) {
    emit('open-sidebar', item.page)
  } else if (item.path) {
    router.push({ name: item.path })
  }
}

function resetCurrentPage() {
  emit('reset-page')
}

// Следим за изменениями в меню
watch(menuSections, () => {
  updateMenuWidth(
    menuSections.value,
    siteName.value,
    userStore,
    getSeparator,
    shouldShowSeparator,
    emit,
    isCollapsed.value
  )
}, { deep: true })

watch(siteName, () => {
  updateMenuWidth(
    menuSections.value,
    siteName.value,
    userStore,
    getSeparator,
    shouldShowSeparator,
    emit,
    isCollapsed.value
  )
})

// Следим за изменениями пользователя
watch(() => userStore.user, (newUser, oldUser) => {
  const oldName = oldUser ? `${oldUser.first_name || ''} ${oldUser.last_name || ''}`.trim() : ''
  const newName = newUser ? `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim() : ''

  if (oldName !== newName && newName) {
    if (isCollapsed.value) {
      isHovering.value = true
      setTimeout(() => {
        updateMenuWidth(
          menuSections.value,
          siteName.value,
          userStore,
          getSeparator,
          shouldShowSeparator,
          emit,
          isCollapsed.value
        )
      }, 100)
    } else {
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
  } else {
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
}, { deep: true })

// Инициализация при монтировании
onMounted(async () => {
  // Фильтруем меню по правам доступа
  menuSections.value = await filterMenuByPermissions(
    menuSections.value,
    router,
    AdminPanelMenuSection
  )

  // Загружаем название сайта
  try {
    const res = await apiClient.get(endpoints.settings.lastSettings)
    if (res.success) {
      const settings = Array.isArray(res.data) ? res.data[0] : res.data
      siteName.value = settings?.site_name || 'ERGO MS'
    } else {
      siteName.value = 'ERGO MS'
    }
  } catch {
    siteName.value = 'ERGO MS'
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
  const updateCallback = () => updateMenuWidth(
    menuSections.value,
    siteName.value,
    userStore,
    getSeparator,
    shouldShowSeparator,
    emit,
    isCollapsed.value
  )

  setupWidthTracking(updateCallback)

  setTimeout(() => {
    setupWidthTracking(updateCallback)
  }, 500)
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
        <div class="side-header__icon">
          <Cog :size="32" />
        </div>
        <div class="side-header__title text-smooth-animation" :class="{ hidden: !isHovering }">
          {{ siteName }}
        </div>
      </RouterLink>
      <div class="side-menu__toggle">
        <button @click="toggleMenu" class="btn btn-primary">
          <ChevronLeft :class="{ rotated: isCollapsed }" :size="20" class="menu-group__chevron" />
        </button>
      </div>
    </div>
    <div class="side-header__shadow" style="display: block"></div>
    <PerfectScrollbar :tag="'ul'" :options="{ suppressScrollX: true, wheelPropagation: false }" class="side-menu__list p-3" :class="{ short: !isHovering }">
      <li v-for="(section, index) in menuSections" :key="index">
        <div v-if="shouldShowSeparator(index)" class="side-menu__divider side-divider py-3">
          <div class="side-divider__icon"><Minus :size="20" /></div>
          <div class="side-divider__name text-smooth-animation" :class="{ hidden: !isHovering }">
            {{ getSeparator(index) }}
          </div>
        </div>
        
        <MenuGroup
          :is-hovering="isHovering"
          :is-collapsed="!isCollapsed"
          :is-open="openGroupRouteName === section.routeName"
          :data="section"
          :current-page="props.currentPage"
          :nested-open-states="nestedOpenStates"
          @toggle="toggleGroup(section.routeName)"
          @action="handleAction"
          @navigate="handleNavigate"
          @reset-page="resetCurrentPage"
          @toggle-nested="toggleNestedGroup"
        />
      </li>
    </PerfectScrollbar>
    <MenuToolbar 
      :is-collapsed="isCollapsed" 
      :is-hovering="isHovering" 
      @dropdown-state-change="setToolbarDropdownActive"
    />
  </aside>
</template>

<style lang="scss" scoped>
// Меню
.side-menu {
  position: fixed;
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

// Иконка логотипа
.side-header__icon {
  width: 32px;
  height: 32px;
  color: var(--color-primary-text);
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
  flex: 1 1 auto;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-x: hidden;

  &.short {
    overflow: hidden;
  }
}

// Разделитель
.side-divider {
  @include flex-row-gap($padding-internal, center);
  padding: $padding-internal $padding-external;
  overflow: hidden;

  &__name,
  &__icon {
    user-select: none;
    color: var(--color-secondary-text);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

// Принудительно скрываем горизонтальный скролл
.ps {
  overflow-x: hidden !important;
}
.ps__rail-x,
.ps__thumb-x {
  display: none !important;
}
</style>
