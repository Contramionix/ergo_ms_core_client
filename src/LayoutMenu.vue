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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { isDatasetSidebarOpen, currentSidebarPage } from '@/core/bi/MainPage/Sidebar/components/js/useSidebarStore'
import { useUserStore } from '@/core/cms/js/userStore.js'
import MenuList from '@/components/menu/MenuList.vue'

import StorageSidebar from '@/core/bi/MainPage/Sidebar/StorageSidebar.vue'
import BIAnalysisModal from '@/core/bi/components/BIAnalysisModal.vue'
import BIChartsModal from '@/core/bi/components/BIChartsModal.vue'
import { biAnalysisService } from '@/core/bi/js/biAnalysisService.js'
import { biChartsService } from '@/core/bi/js/biChartsService.js'
import { Menu as IconMenu } from 'lucide-vue-next'

const userStore = useUserStore()
const leftPadding = ref('300px') // Увеличиваем начальное значение для адаптивной ширины
const isMenuVisible = ref(window.innerWidth >= 1200)
const isMenuToggledManually = ref(false)
const isOverlayVisible = ref(false)
const isMenuCollapsed = ref(false)
const menuWidth = ref(260)
const isBIAnalysisModalVisible = ref(false)
const isBIChartsModalVisible = ref(false)
const chartsModalFileId = ref(null)

function updateMenuVisibility() {
  if (window.innerWidth >= 1200) {
    isMenuVisible.value = true
    isOverlayVisible.value = false
    isMenuToggledManually.value = false
  } else if (!isMenuToggledManually.value) {
    isMenuVisible.value = false
    isOverlayVisible.value = false
  }
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

function openSidebarWithPage(pageName) {
  currentSidebarPage.value = pageName
  isDatasetSidebarOpen.value = true
}

function openSidebarFromMenu(page) {
  openSidebarWithPage(page)
}

function closeSidebar() {
  isDatasetSidebarOpen.value = false
  currentSidebarPage.value = ''
}

function onHamburgerClick() {
  toggleMenu(!isMenuVisible.value)
}

onMounted(async () => {
  updateMenuVisibility()
  window.addEventListener('resize', updateMenuVisibility)
  
  // Инициализируем пользователя при загрузке авторизованной области
  await userStore.initializeUser()
  
  // Подписываемся на изменения состояния BI анализа
  biAnalysisService.subscribe((isOpen) => {
    isBIAnalysisModalVisible.value = isOpen
  })
  
  // Подписываемся на изменения состояния BI графиков
  biChartsService.subscribe((isOpen, fileId) => {
    isBIChartsModalVisible.value = isOpen
    chartsModalFileId.value = fileId
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMenuVisibility)
})
</script>

<template>
  <Teleport to="body">
    <div class="mobile-header d-xl-none">
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
  <div class="layout-container">
    <MenuList
      :current-page="currentSidebarPage"
      @left-padding="leftToggle"
      :is-visible="isMenuVisible"
      @open-sidebar="openSidebarFromMenu"
      @reset-page="() => currentSidebarPage = ''"
      @menu-state-change="handleMenuStateChange"
    />
    <div class="layout-page" :style="{ paddingLeft: leftPadding }">
      <div class="py-4 container-xxl">
        <RouterView :key="$route.path" />
      </div>
    </div>
  </div>

  <div @click="closeMenu" class="layout-overlay" :class="{ active: isOverlayVisible }" />
  <StorageSidebar 
    :isDatasetSidebarOpen="isDatasetSidebarOpen" 
    :currentPage="currentSidebarPage" 
    :isMenuCollapsed="isMenuCollapsed"
    :menuWidth="menuWidth"
    @close="closeSidebar"
  />
  <BIAnalysisModal 
    :show="isBIAnalysisModalVisible"
    @close="() => biAnalysisService.close()"
  />
  <BIChartsModal 
    :show="isBIChartsModalVisible"
    :file-id="chartsModalFileId"
    @close="() => biChartsService.close()"
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
  }
  :deep(.side-menu__toggle) {
    display: none !important;
  }
}
</style>
