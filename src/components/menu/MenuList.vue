<script setup>
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { onMounted, onBeforeUnmount, provide, ref, watch, nextTick, computed } from 'vue'
import { ChevronLeft, Minus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useToast } from '@/js/utils/toast.js'

import SiteWordmark from '@/components/SiteWordmark.vue'
import { useSiteName } from '@/composables/useSiteName.js'

import {
  getUserMenu,
  peekCachedMenu,
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
import { safeNavigateByName } from './composables/safeMenuNavigate.js'
import {
  getMenuLayoutPaddingFallback,
  measureMenuLayoutOffset,
} from './composables/menuLayoutMeasure.js'
import {
  readMenuCollapsedPreference,
  writeMenuCollapsedPreference,
} from './composables/useMenuCollapsedPreference.js'
import { openOffcanvasSidebar } from '@/js/useOffcanvasSidebarStore.js'

const props = defineProps({
  isVisible: Boolean,
})

const emit = defineEmits(['left-padding', 'menu-state-change', 'reset-offcanvas-page'])

const router = useRouter()
const userStore = useUserStore()
const toast = useToast()

// Состояние меню
const isCollapsed = ref(readMenuCollapsedPreference())
const isHovering = ref(!isCollapsed.value)
const showMenuLabels = computed(() => !isCollapsed.value || isHovering.value)
const isToolbarDropdownActive = ref(false)
const menuSections = ref([])
const isMenuReady = ref(false)
const allowMenuTransitions = ref(false)
const { siteName, ensureSiteNameLoaded } = useSiteName()
const menuRef = ref(null)

let layoutObserver = null
let layoutSyncFrame = null
let layoutSyncTimeout = null

const MENU_LAYOUT_SYNC_DELAY_MS = 320

function syncLayoutOffset() {
  if (layoutSyncFrame) {
    cancelAnimationFrame(layoutSyncFrame)
  }

  layoutSyncFrame = requestAnimationFrame(() => {
    layoutSyncFrame = null

    const measured = measureMenuLayoutOffset(menuRef.value)
    if (measured) {
      emit('left-padding', measured)
      return
    }

    emit('left-padding', getMenuLayoutPaddingFallback(isCollapsed.value, menuWidth.value))
  })
}

function scheduleLayoutOffsetSync(delay = 0) {
  if (layoutSyncTimeout) {
    clearTimeout(layoutSyncTimeout)
    layoutSyncTimeout = null
  }

  if (delay > 0) {
    layoutSyncTimeout = setTimeout(syncLayoutOffset, delay)
    return
  }

  syncLayoutOffset()
}

function handleMenuMetricsChange(collapsed, width) {
  emit('menu-state-change', collapsed, width)
  scheduleLayoutOffsetSync()
}

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
  if (!allowMenuTransitions.value) {
    return
  }

  updateMenuWidth(
    menuSections.value,
    siteName.value,
    userStore,
    getSeparator,
    shouldShowSeparator,
    handleMenuMetricsChange,
    isCollapsed.value,
  )
}

function applyInitialMenuLayout() {
  initializeMenuWidth(
    menuSections.value,
    siteName.value,
    userStore,
    getSeparator,
    shouldShowSeparator,
    handleMenuMetricsChange,
    isCollapsed.value,
  )
}

async function finishMenuBootstrap() {
  await nextTick()
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve)
    })
  })
  allowMenuTransitions.value = true
  updateWidth()
}

// Ссылка на уже применённые данные меню. getUserMenu возвращает один и тот же
// объект из in-memory кеша, поэтому повторный вызов не пересобирает список и не
// перерисовывает иконки (важно для отсутствия мигания при гидратации + onMounted).
let appliedMenuData = null

function applyMenuData(menuData, { force = false } = {}) {
  if (!menuData?.menu_items?.length) {
    return false
  }

  if (!force && menuData === appliedMenuData && menuSections.value.length > 0) {
    return true
  }

  menuSections.value = transformMenuData(menuData)
  separatorsConfig.value = transformSeparators(menuData.separators || [], menuData.menu_items)
  appliedMenuData = menuData
  return true
}

function hydrateMenuFromCache() {
  const cached = peekCachedMenu()
  return cached ? applyMenuData(cached) : false
}

if (hydrateMenuFromCache()) {
  isMenuReady.value = true
  applyInitialMenuLayout()
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
      if (isCollapsed.value) {
        isHovering.value = false
      }
      applyInitialMenuLayout()
      setTimeout(updateWidth, 50)
    }
  },
)

// Переключение меню
const toggleMenu = () => {
  isCollapsed.value = !isCollapsed.value
  writeMenuCollapsedPreference(isCollapsed.value)
  isHovering.value = !isCollapsed.value
  emit('menu-state-change', isCollapsed.value, menuWidth.value)
  scheduleLayoutOffsetSync(MENU_LAYOUT_SYNC_DELAY_MS)
}

// Обработка наведения
const handleMouseEnter = () => {
  if (isCollapsed.value) {
    isHovering.value = true
    scheduleLayoutOffsetSync(MENU_LAYOUT_SYNC_DELAY_MS)
  }
}

const handleMouseLeave = () => {
  if (isCollapsed.value && !isToolbarDropdownActive.value) {
    isHovering.value = false
    scheduleLayoutOffsetSync(MENU_LAYOUT_SYNC_DELAY_MS)
  }
}

// Управление состоянием тулбара
const setToolbarDropdownActive = (active) => {
  isToolbarDropdownActive.value = active
  if (active && isCollapsed.value) {
    isHovering.value = true
    scheduleLayoutOffsetSync(MENU_LAYOUT_SYNC_DELAY_MS)
  }
}

const handleNavigate = (item) => {
  const externalUrl = item.externalUrl || item.external_url
  if (item.item_type === 'external' && externalUrl) {
    window.open(externalUrl, '_blank', 'noopener,noreferrer')
    return
  }

  if (item.isOffcanvas && item.page) {
    openOffcanvasSidebar(item.page)
    return
  }

  if (item.routeName) {
    safeNavigateByName(router, item.routeName)
    return
  }

  if (item.path) {
    safeNavigateByName(router, item.path)
  }
}

const resetOffcanvasPage = () => emit('reset-offcanvas-page')

// Следим за изменениями в меню — только после завершения bootstrap
watch(menuSections, () => {
  if (allowMenuTransitions.value) {
    updateWidth()
  }
}, { deep: true })
watch(siteName, () => {
  if (allowMenuTransitions.value) {
    updateWidth()
  }
})

// Следим за изменениями имени пользователя (только имя, не весь объект)
watch(() => userStore.fullName, (newName, oldName) => {
  if (allowMenuTransitions.value && oldName !== newName && newName) {
    updateWidth()
  }
})

// Загрузка меню из API
const loadMenu = async (forceRefresh = false) => {
  const resetMenu = () => {
    menuSections.value = []
    separatorsConfig.value = { byOrderIndex: {} }
    appliedMenuData = null
  }

  try {
    const menuData = await getUserMenu(forceRefresh)

    if (menuData?.menu_items?.length > 0) {
      const applied = applyMenuData(menuData, { force: forceRefresh })
      if (applied && forceRefresh) {
        applyInitialMenuLayout()
      }
      return
    }

    resetMenu()
    toast.warning('Меню пока не настроено. Обратитесь к администратору.')
  } catch (error) {
    if (!menuSections.value.length) {
      resetMenu()
    }
    toast.error('Не удалось загрузить меню. Попробуйте обновить страницу.')
    logError('Ошибка загрузки меню:', error)
  }
}

// Слушаем событие обновления меню
const handleMenuUpdate = () => loadMenu(true)

// Инициализация при монтировании
onMounted(async () => {
  window.addEventListener('menu-updated', handleMenuUpdate)

  await Promise.all([
    ensureSiteNameLoaded(),
    userStore.isInitialized ? Promise.resolve(true) : userStore.initializeUser(),
  ])

  if (!isMenuReady.value) {
    await loadMenu()
    isMenuReady.value = true
    applyInitialMenuLayout()
  } else {
    await loadMenu()
  }

  scheduleLayoutOffsetSync()

  if (isCollapsed.value) {
    isHovering.value = false
  }

  if (menuRef.value && typeof ResizeObserver !== 'undefined') {
    layoutObserver = new ResizeObserver(() => scheduleLayoutOffsetSync())
    layoutObserver.observe(menuRef.value)
  }

  setupWidthTracking(() => {
    updateWidth()
    scheduleLayoutOffsetSync()
  })

  await finishMenuBootstrap()
})

// Удаляем слушатель при размонтировании
onBeforeUnmount(() => {
  window.removeEventListener('menu-updated', handleMenuUpdate)
  layoutObserver?.disconnect()
  if (layoutSyncFrame) {
    cancelAnimationFrame(layoutSyncFrame)
  }
  if (layoutSyncTimeout) {
    clearTimeout(layoutSyncTimeout)
  }
})
</script>

<template>
  <aside ref="menuRef" class="side-menu card p-0" :class="{ collapsed: isCollapsed, hovering: isHovering, 'is-hidden': !isVisible, 'side-menu--bootstrapping': !allowMenuTransitions }" :style="{ '--menu-width': `${menuWidth}px` }" @mouseleave="handleMouseLeave">
    <div class="side-menu__header side-header">
      <div class="side-header__brand-row">
        <RouterLink :to="{ name: 'AppHome' }" class="side-menu__logo">
          <div class="side-header__title text-smooth-animation">
            <SiteWordmark :compact="isCollapsed && !isHovering" :compact-icon-size="menuIconSizes.item" class="site-wordmark--menu"/>
          </div>
        </RouterLink>
        <div class="side-menu__toggle">
          <button @click="toggleMenu" class="btn btn-primary">
            <ChevronLeft :class="{ rotated: isCollapsed }" :size="menuIconSizes.toggle" class="menu-group__chevron"/>
          </button>
        </div>
      </div>
    </div>
    <div class="side-header__shadow" style="display: block"></div>
    <div class="side-menu__body" @mouseenter="handleMouseEnter">
      <div class="side-menu__scroll">
        <ul v-show="isMenuReady" class="side-menu__list p-2" :class="{ short: isCollapsed && !isHovering }">
        <li v-for="(section, index) in menuSections" :key="section.id ?? section.routeName ?? index">
          <div v-if="shouldShowSeparator(index)" class="side-menu__divider side-divider py-2">
            <div class="side-divider__icon"><Minus :size="menuIconSizes.divider" /></div>
            <div class="side-divider__name text-smooth-animation" :class="{ hidden: !showMenuLabels }">
              {{ getSeparator(index) }}
            </div>
          </div>
          
          <MenuGroup :is-hovering="showMenuLabels" :is-collapsed="!isCollapsed" :is-open="openGroupRouteName === section.routeName" :data="section" :nested-open-states="nestedOpenStates" @toggle="toggleGroup(section.routeName)" @navigate="handleNavigate" @reset-offcanvas-page="resetOffcanvasPage" @toggle-nested="toggleNestedGroup"/>
        </li>
        </ul>
      </div>
      <MenuToolbar :is-collapsed="isCollapsed" :is-hovering="showMenuLabels" @dropdown-state-change="setToolbarDropdownActive"/>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.side-menu__logo {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  min-width: 0;
  text-decoration: none;
  color: inherit;
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
  transition:
    transform $transition,
    inline-size $transition;

  &--bootstrapping {
    transition: none;
  }

  &.is-hidden {
    transform: translateX(-110%);
  }

  &.collapsed:not(.hovering) {
    inline-size: 84px;

    .side-header {
      padding: 12px 0 0;
    }

    .side-menu__logo {
      width: 100%;
      box-sizing: border-box;
      justify-content: flex-start;
      // та же колонка, что у .nav-btn внутри ul.p-2
      padding: $padding-internal 0 $padding-internal calc(0.5rem + #{$padding-external});
    }

    .side-header__title {
      display: flex;
      flex-grow: 0;
      justify-content: flex-start;
    }

    :deep(.site-wordmark--menu) {
      letter-spacing: 0;
    }
  }
}

.side-menu__scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 10rem;

    &:hover {
      background: var(--scrollbar-thumb-hover);
    }

    &:active {
      background: var(--scrollbar-thumb-active);
    }
  }
}

.side-header {
  position: relative;
  padding: 12px 0 0 26px;
}

.side-header__brand-row {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 0;
}

.side-header a {
  @include flex-row-gap($padding-internal, center);
  text-decoration: none;
}

.side-header__shadow {
  position: absolute;
  top: 2.875rem;
  width: 100%;
  height: 1.5rem;
  background: linear-gradient(var(--bs-card-bg) 41%, transparent);
  pointer-events: none;
  z-index: 2;
  transition: background $transition;
}

.side-header__title {
  flex-grow: 1;
  color: var(--color-primary-text);
  font-size: $font-size-h1;
  font-weight: bold;
  line-height: 1;
  white-space: nowrap;
  text-overflow: ellipsis;
  user-select: none;
  overflow: hidden;
}

.side-menu__toggle {
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 3;
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

.menu-group__chevron {
  transition: transform 0.3s ease;

  &.rotated {
    transform: rotate(180deg);
  }
}

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