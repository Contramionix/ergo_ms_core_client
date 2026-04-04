<!--
  ОСНОВНОЙ LAYOUT КОМПОНЕНТ С БОКОВЫМ МЕНЮ
  
  Данный компонент представляет собой основную структуру приложения ERGO MS,
  включающую боковое меню, шапку и основную область контента.
  
  Функциональность:
  - Адаптивное боковое меню с возможностью сворачивания/разворачивания
  - Автоматическое скрытие меню на мобильных устройствах (<1200px)
  - Overlay для закрытия меню на мобильных устройствах
  - Боковая панель (offcanvas) для BI модуля с поддержкой датасетов, подключений и чартов
  - Динамическое изменение отступов основного контента в зависимости от состояния меню
  - Интеграция с системой маршрутизации Vue Router
  
  Состояния меню:
  - isMenuVisible: видимость меню (учитывает размер экрана и ручное управление)
  - isMenuToggledManually: флаг ручного управления меню пользователем
  - isOverlayVisible: показ затемняющего overlay на мобильных устройствах
  - leftPadding: динамический отступ для основного контента
-->

<script setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { isDatasetSidebarOpen, currentSidebarPage } from '@/js/useBISidebarStore.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import MenuList from '@/components/menu/MenuList.vue'
import AccessDenied from '@/components/AccessDenied.vue'
import { accessDeniedState } from './js/accessDeniedState'
import { Menu as IconMenu } from 'lucide-vue-next'

// LayoutPlugin регистрирует весь BI layout-слой (StorageSidebar и др.) только если модуль установлен.
// import.meta.glob возвращает {} без ошибок когда файл отсутствует.
const _biLayoutGlob = import.meta.glob('../../../modules/bi_analysis/client/LayoutPlugin.vue')
const biLayoutPlugin = shallowRef(null)

const userStore = useUserStore()
const route = useRoute()

let resizeTimeout = null

// Ключ для RouterView - позволяет не пересоздавать компонент при переключении между вкладками
// Модули могут указать meta.cacheGroup для группировки роутов под одним ключом
const routeViewKey = computed(() => {
  if (route.meta?.cacheGroup) {
    return route.meta.cacheGroup
  }
  // Страницы датасета с вкладками: /bi/datasets/:id/:tab — один ключ на датасет, без пересоздания при смене вкладки
  const datasetMatch = route.path.match(/^\/bi\/datasets\/(\d+)(?:\/|$)/)
  if (datasetMatch) {
    return `/bi/datasets/${datasetMatch[1]}`
  }
  const newDatasetMatch = route.path.match(/^\/bi\/datasets\/new(?:\/|$)/)
  if (newDatasetMatch) {
    return '/bi/datasets/new'
  }
  return route.path
})

const leftPadding = ref('320px')
const isMenuVisible = ref(window.innerWidth >= 1200)
const isMenuToggledManually = ref(false)
const isOverlayVisible = ref(false)
const isMenuCollapsed = ref(false)
const menuWidth = ref(260)

// Полноэкранный режим (без меню и ограничений контейнера)
const isFullPage = computed(() => route.meta?.fullPage === true)

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

function handleMenuStateChange(collapsed, width) {
  isMenuCollapsed.value = collapsed
  menuWidth.value = width
}

function openSidebar(pageName) {
  currentSidebarPage.value = pageName
  isDatasetSidebarOpen.value = true
}

function onHamburgerClick() {
  toggleMenu(!isMenuVisible.value)
}

onMounted(async () => {
  // Инициализируем сразу без debounce
  updateMenuVisibilityImmediate()
  window.addEventListener('resize', updateMenuVisibility)
  
  // Инициализируем пользователя при загрузке авторизованной области
  await userStore.initializeUser()

  // Загружаем BI layout-компонент если модуль установлен
  const key = Object.keys(_biLayoutGlob)[0]
  if (key) biLayoutPlugin.value = (await _biLayoutGlob[key]()).default
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMenuVisibility)
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
})
</script>

<template>
  <!-- Мобильный хедер (скрывается для полноэкранных страниц) -->
  <Teleport to="body">
    <div v-if="!isFullPage" class="mobile-header d-xl-none">
      <button
        class="btn btn-link d-flex align-items-center justify-content-center mobile-header__btn"
        type="button"
        :aria-label="isMenuVisible ? 'Закрыть меню' : 'Открыть меню'"
        :title="isMenuVisible ? 'Закрыть меню' : 'Открыть меню'"
        @click="onHamburgerClick"
      >
        <IconMenu :size="24" />
      </button>
      <RouterLink to="/" class="mobile-header__brand text-decoration-none">
        <span class="fw-semibold">ERGO&nbsp;MS</span>
      </RouterLink>
    </div>
  </Teleport>
  <div class="layout-container" :class="{ 'layout-container--full-page': isFullPage }">
    <!-- Боковое меню (скрывается для полноэкранных страниц) -->
    <MenuList
      v-if="!isFullPage"
      :current-page="currentSidebarPage"
      @left-padding="leftToggle"
      :is-visible="isMenuVisible"
      @open-sidebar="openSidebar"
      @reset-page="() => currentSidebarPage = ''"
      @menu-state-change="handleMenuStateChange"
    />
    <div class="layout-page" :class="{ 'layout-page--full-page': isFullPage }">
      <!-- Полноэкранный режим для страниц с meta.fullPage: true -->
      <template v-if="route.meta?.fullPage">
        <AccessDenied
          v-if="accessDeniedState.active"
          bordered
          :title="accessDeniedState.title"
          :message="accessDeniedState.message"
        />
        <RouterView v-else :key="routeViewKey" />
      </template>
      <!-- Стандартный режим с контейнером и отступами -->
      <div v-else class="py-4 container-xxl">
        <AccessDenied
          v-if="accessDeniedState.active"
          bordered
          :title="accessDeniedState.title"
          :message="accessDeniedState.message"
        />
        <RouterView v-else :key="routeViewKey" />
      </div>
    </div>
  </div>

  <div @click="closeMenu" class="layout-overlay" :class="{ active: isOverlayVisible }" />
  <component
    v-if="biLayoutPlugin"
    :is="biLayoutPlugin"
    :isMenuCollapsed="isMenuCollapsed"
    :menuWidth="menuWidth"
  />
</template>

<style scoped lang="scss">
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 1100;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  padding: 0 12px;
  width: 100%;

  &__btn {
    width: 40px;
    height: 40px;
    margin-right: 8px;
    color: #0d6efd;
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    color: inherit;
  }
}
.layout-page {
  padding-inline-start: v-bind(leftPadding);
  transition: padding-inline-start 0.3s ease;

  // Полноэкранный режим - без паддингов
  &--full-page {
    padding-inline-start: 0 !important;
    height: 100dvh;
  }
}

// Полноэкранный контейнер
.layout-container--full-page {
  height: 100dvh;
  overflow: hidden;

  .layout-page--full-page {
    height: 100dvh;
    overflow: auto;
  }
}

.layout-overlay {
  z-index: 1004;
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

    // Полноэкранный режим на мобильных - без верхнего отступа
    &--full-page {
      height: 100dvh;
    }
  }
  :deep(.side-menu__toggle) {
    display: none !important;
  }
}
</style>
