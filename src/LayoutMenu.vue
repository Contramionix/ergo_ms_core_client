<!--
  ОСНОВНОЙ LAYOUT КОМПОНЕНТ С БОКОВЫМ МЕНЮ
  
  Данный компонент представляет собой основную структуру приложения ERGO MS,
  включающую боковое меню, шапку и основную область контента.
  
  Функциональность:
  - Адаптивное боковое меню с возможностью сворачивания/разворачивания
  - Автоматическое скрытие меню на мобильных устройствах (<1200px)
  - Overlay для закрытия меню на мобильных устройствах
  - Динамическое изменение отступов основного контента в зависимости от состояния меню
  - Интеграция с системой маршрутизации Vue Router
  
  Состояния меню:
  - isMenuVisible: видимость меню (учитывает размер экрана и ручное управление)
  - isMenuToggledManually: флаг ручного управления меню пользователем
  - isOverlayVisible: показ затемняющего overlay на мобильных устройствах
  - leftPadding: динамический отступ для основного контента
-->

<script setup>
import { ref, computed, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  closeOffcanvasSidebar,
} from '@/js/useOffcanvasSidebarStore.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { ensurePresenceConnected } from '@/core/cms/adp/js/presence/usePresenceConnection.js'
import MenuList from '@/components/menu/MenuList.vue'
import LayoutBackdrop from '@/components/LayoutBackdrop.vue'
import AccessDenied from '@/components/AccessDenied.vue'
import { accessDeniedState } from './js/accessDeniedState'
import { Menu as IconMenu } from 'lucide-vue-next'

import { initEndpoints } from '@/js/api/endpoints.js'
import SiteWordmark from '@/components/SiteWordmark.vue'
import RouteViewAnimated from '@/components/RouteViewAnimated.vue'

const layoutPluginGlob = import.meta.glob('../../../modules/*/client/LayoutPlugin.vue')
const layoutPlugins = shallowRef([])

const userStore = useUserStore()
const route = useRoute()

let resizeTimeout = null

const leftPadding = ref('279px')
const menuRightEdge = ref('260px')
const isMenuVisible = ref(window.innerWidth >= 1200)
const isMenuToggledManually = ref(false)
const isOverlayVisible = ref(false)
const isMenuCollapsed = ref(false)
const menuWidth = ref(260)
const isMenuLayoutTransitioning = ref(false)

// Полноэкранный режим (без меню и ограничений контейнера)
const isFullPage = computed(() => route.meta?.fullPage === true)

watch(
  isFullPage,
  (fullPage) => {
    if (fullPage) {
      closeOffcanvasSidebar()
    }
  },
  { immediate: true, flush: 'sync' },
)

// Декоративный фон с «кругляшками» — только на стандартных shell-страницах (home, 404 и т.п.)
const showShellBackdrop = computed(() =>
  route.matched.some((record) => record.meta?.shellBackdrop === true),
)

function updateMenuVisibilityImmediate() {
  if (window.innerWidth >= 1200) {
    isMenuVisible.value = true
    isOverlayVisible.value = false
    isMenuToggledManually.value = false
  } else if (!isMenuToggledManually.value) {
    isMenuVisible.value = false
    isOverlayVisible.value = false
  }
}

// Debounced версия для resize event (избегаем лишних вычислений при ресайзе)
function updateMenuVisibility() {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  resizeTimeout = setTimeout(updateMenuVisibilityImmediate, 150)
}

function toggleMenu(isVisible) {
  isMenuToggledManually.value = true
  isMenuVisible.value = isVisible
  isOverlayVisible.value = isVisible && window.innerWidth < 1200
}

function closeMenu() {
  isMenuVisible.value = false
  isOverlayVisible.value = false
  isMenuToggledManually.value = false
}

function leftToggle(val) {
  leftPadding.value = val
}

function handleMenuRightEdge(val) {
  menuRightEdge.value = val
}

function handleMenuStateChange(collapsed, width) {
  isMenuCollapsed.value = collapsed
  menuWidth.value = width
}

function handleMenuLayoutSyncTransition(active) {
  isMenuLayoutTransitioning.value = active
}

function onHamburgerClick() {
  toggleMenu(!isMenuVisible.value)
}

onMounted(async () => {
  updateMenuVisibilityImmediate()
  window.addEventListener('resize', updateMenuVisibility)
  await userStore.initializeUser()
  if (userStore.isAuthenticated) {
    ensurePresenceConnected()
  }

  await initEndpoints()

  const plugins = []
  for (const loadPlugin of Object.values(layoutPluginGlob)) {
    try {
      const module = await loadPlugin()
      plugins.push(module.default)
    } catch (e) {
      logError('Ошибка загрузки layout-плагина модуля', e)
    }
  }
  layoutPlugins.value = plugins
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMenuVisibility)
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="!isFullPage" class="mobile-header d-xl-none">
      <button class="btn btn-link d-flex align-items-center justify-content-center mobile-header__btn" type="button" :aria-label="isMenuVisible ? 'Закрыть меню' : 'Открыть меню'" :title="isMenuVisible ? 'Закрыть меню' : 'Открыть меню'" @click="onHamburgerClick">
        <IconMenu :size="24" />
      </button>
      <RouterLink :to="{ name: 'AppHome' }" class="mobile-header__brand text-decoration-none">
        <SiteWordmark class="site-wordmark--mobile site-wordmark--centered" />
      </RouterLink>
    </div>
  </Teleport>
  <div class="layout-container" :class="{ 'layout-container--full-page': isFullPage }">
    <MenuList v-if="!isFullPage" @left-padding="leftToggle" @menu-right-edge="handleMenuRightEdge" @layout-sync-transition="handleMenuLayoutSyncTransition" :is-visible="isMenuVisible" @menu-state-change="handleMenuStateChange"/>
    <div class="layout-page" :class="{ 'layout-page--full-page': isFullPage, 'layout-page--menu-sync-transition': isMenuLayoutTransitioning }">
      <LayoutBackdrop v-if="!isFullPage && showShellBackdrop" />
      <div class="layout-page__content">
        <template v-if="route.meta?.fullPage">
          <AccessDenied v-if="accessDeniedState.active" bordered :title="accessDeniedState.title" :message="accessDeniedState.message"/>
          <RouteViewAnimated v-else />
        </template>
        <div v-else :class="route.meta?.flushContent ? 'layout-content--flush' : 'py-4 container-xxl'">
          <AccessDenied v-if="accessDeniedState.active" bordered :title="accessDeniedState.title" :message="accessDeniedState.message"/>
          <RouteViewAnimated v-else />
        </div>
      </div>
    </div>
  </div>

  <div @click="closeMenu" class="layout-overlay" :class="{ active: isOverlayVisible }" />
  <component v-for="(plugin, index) in layoutPlugins" :key="index" :is="plugin" :isMenuCollapsed="isMenuCollapsed" :menuWidth="menuWidth" :menuRightEdge="menuRightEdge"/>
</template>

<style scoped lang="scss">
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 1100;
  background: var(--color-header-background);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  width: 100%;

  &__btn {
    width: 40px;
    height: 40px;
    margin-right: 8px;
    color: var(--color-accent);
  }

  &__brand {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    color: inherit;

    :deep(.site-wordmark--mobile) {
      font-size: 1.875rem;
    }
  }
}
.layout-page {
  position: relative;
  padding-inline-start: v-bind(leftPadding);
  overflow-x: clip;
  min-height: 100dvh;
  background: var(--color-background);

  &--menu-sync-transition {
    transition: padding-inline-start $transition;
  }

  &--full-page {
    padding-inline-start: 0 !important;
    height: 100dvh;
    min-height: 100dvh;
  }
}

.layout-page__content {
  position: relative;
  z-index: 1;
  min-height: inherit;
  overflow: clip;
}

.layout-container--full-page {
  height: 100dvh;
  overflow: hidden;

  .layout-page--full-page {
    height: 100dvh;
    overflow: auto;
  }
}

.layout-content--flush {
  padding: 0;
  max-width: none;
  overflow: clip;
}

.layout-overlay {
  z-index: 1004;
}

:deep(.site-wordmark--menu) {
  font-size: 2.5rem;
}

@media (width < 1200px) {
  .layout-container {
    height: 100dvh;
    overflow: hidden;
  }
  .layout-page {
    padding-inline-start: 0;
    padding-top: 0;
    height: calc(100dvh - 56px);
    overflow: auto;
    overscroll-behavior: contain;

    &--full-page {
      height: 100dvh;
    }
  }
  :deep(.side-menu__toggle) {
    display: none !important;
  }
}
</style>
