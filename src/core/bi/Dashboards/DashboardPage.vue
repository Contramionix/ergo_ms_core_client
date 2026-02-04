<template>
    <div class="dashboard-page">
        <div class="body-header border-elements elements-color">
            <div class="header-label-icon">
                <LayoutDashboard />
                <div ref="headerLabelTextRef" 
                     class="header-label-text" 
                     :class="{ 'clickable': pages.length > 1, 'dropdown-open': showPageDropdown }"
                     @click="togglePageDropdown"
                     @mouseenter="handleHeaderHover"
                     @mouseleave="handleHeaderLeave">
                    <h4 class="header-label" :style="{ marginBottom: pages.length > 1 ? '-2px' : '3px' }">{{ dashboardName }}</h4>
                    <div v-if="pages.length > 1" 
                         class="header-label-pages" 
                         :class="{ 'flipping': isFlipping }"
                         style="color: var(--color-secondary-text); font-size: 14px;">
                        <span class="text-content">{{ displayText }}</span>
                    </div>
                    
                    <div v-if="showPageDropdown && pages.length > 1" 
                         class="page-dropdown"
                         :style="{ width: dropdownWidth + 'px' }">
                        <div v-for="(page, index) in pages" 
                             :key="index" 
                             class="page-dropdown-item"
                             :class="{ 'active': index === currentPageIndex }"
                             @click="selectPage(index, $event)">
                            {{ page.name }}
                        </div>
                    </div>
                </div>
            </div>
            
            <div v-if="isHeaderButtonsReady" class="header-label-buttons">
                <template v-if="isViewMode">
                    <button v-if="canEditDashboard" class="btn btn-sm btn-primary" @click="goToEditMode">
                        <Pencil :size="16" class="btn-icon-inline" />
                        Редактировать
                    </button>
                </template>
                <template v-else>
                    <button class="btn btn-sm btn-secondary" @click="isPageWindowVisible = true">Страницы</button>
                    <button class="btn btn-sm btn-primary" :disabled="!dashboardRequiredFieldsFilled || !isDashboardDirty"
                        @click="handleSaveClick">{{ isEditMode ? 'Сохранить изменения' : 'Создать дашборд' }}
                    </button>
                </template>
            </div>
        </div>
        
        <PageWindow 
            v-if="isPageWindowVisible"
            v-model="pages"
            @close="isPageWindowVisible = false"
        />

        <div v-if="isHeaderSettingsVisible" class="page-window-overlay" @click="closeHeaderSettings">
          <div class="page-window" @click.stop>
            <HeaderSettings 
              :data="headerSettingsData" 
              @close="closeHeaderSettings"
              @save="saveHeaderSettings" 
            />
          </div>
        </div>

        <div v-if="isTextSettingsVisible" class="page-window-overlay" @click="closeTextSettings">
          <div class="page-window" @click.stop>
            <TextSettings 
              :data="textSettingsData" 
              @close="closeTextSettings"
              @save="saveTextSettings" 
            />
          </div>
        </div>

        <div v-if="isChartSettingsVisible" class="page-window-overlay" @click="closeChartSettings">
          <div class="page-window chart-settings-window" @click.stop>
            <ChartSettings 
              :data="chartSettingsData" 
              @close="closeChartSettings"
              @save="saveChartSettings" 
            />
          </div>
        </div>
        
        <div v-if="isSelectorSettingsVisible" class="page-window-overlay" @click="closeSelectorSettings">
          <div class="page-window selector-settings-window" @click.stop>
            <SelectorSettings 
              :key="selectorSettingsData?.id || 'new'"
              :data="selectorSettingsData" 
              @close="closeSelectorSettings"
              @save="saveSelectorSettings" 
            />
          </div>
        </div>
        
        <SaveDashboardModal
          :visible="isSaveModalVisible"
          :name="dashboardName"
          :description="dashboardDescription"
          :is-edit-mode="isEditMode"
          :saving="saving"
          @close="isSaveModalVisible = false"
          @save="handleSaveDashboard"
        />
        
        <div v-if="isHeaderButtonsReady" class="body-content">
            <DashboardGrid
                ref="dashboardGridRef"
                :items="currentPageItems"
                :dragged-type="isViewMode ? '' : draggedType"
                :pages-count="pages.length"
                :view-mode="isViewMode"
                @update:items="updateCurrentPageItems"
                @item-select="handleItemSelect"
                @item-edit="handleItemEdit"
                @item-delete="handleItemDelete"
            />
        </div>
        
        <div v-if="isHeaderButtonsReady && !isViewMode" class="body-footer" :style="{ left: footerLeftOffset, width: footerWidth }">
            <div class="footer-buttons">
                <DashboardToolbar 
                    @drag-start="handleToolbarDragStart"
                    @drag-end="handleToolbarDragEnd"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboard, Pencil } from 'lucide-vue-next'
import DashboardToolbar from './DashboardToolbar.vue'
import PageWindow from './components/PageWindow.vue'
import DashboardGrid from './DashboardGrid.vue'
import HeaderSettings from './Header/HeaderSettings.vue'
import TextSettings from './Text/TextSettings.vue'
import ChartSettings from './Chart/ChartSettings.vue'
import SelectorSettings from './Selector/SelectorSettings.vue'

import { isDatasetSidebarOpen } from '@/core/bi/MainPage/Sidebar/components/js/useSidebarStore.js'
import { isSidebarCollapsed, initializeSidebarTracking } from '@/core/bi/MainPage/Sidebar/components/js/useMainSidebarStore.js'
import dashboardService from '@/core/bi/MainPage/Sidebar/components/js/dashboardService.js'
import SaveDashboardModal from './components/SaveDashboardModal.vue'
import { useToast } from 'vue-toastification'
import tokenService from '@/core/cms/js/tokenService'

const HEADER_WIDGET_HEIGHTS = {
  'XS': 50,
  'S': 55,
  'M': 60,
  'L': 65,
  'XL': 70
};

const dashboardName = ref('Новый дашборд')
const dashboardDescription = ref('')
const dashboardId = ref(null)
const dashboardOwnerId = ref(null)
const dashboardDataLoaded = ref(false)
const lastSavedSnapshot = ref(null)
const isSaveModalVisible = ref(false)
const isEditMode = computed(() => {
    if (dashboardId.value == null) return true
    if (!canEditDashboard.value) return false
    return route.query.mode === 'edit'
})
const isViewMode = computed(() => dashboardId.value != null && route.query.mode !== 'edit')

const canEditDashboard = computed(() => {
    if (dashboardId.value == null) return true
    if (!dashboardDataLoaded.value) return false
    const ownerId = dashboardOwnerId.value
    if (ownerId == null) return true
    const currentId = tokenService.getUserId() != null ? Number(tokenService.getUserId()) : null
    if (currentId == null) return false
    return currentId === ownerId
})

const isHeaderButtonsReady = computed(() => {
    const idFromRoute = route.params.id
    if (!idFromRoute || idFromRoute === 'new') return true
    return dashboardDataLoaded.value
})
const saving = ref(false)
const dashboardItems = ref({})
const toast = useToast()
const isPageWindowVisible = ref(false)
const pages = ref([{ name: 'Страница 1' }])
const currentPageIndex = ref(0)
const showPageDropdown = ref(false)
const headerHoverText = ref('')
const isFlipping = ref(false)
const headerLabelTextRef = ref(null)
const dropdownWidth = ref(200)
const route = useRoute()
const router = useRouter()
const draggedType = ref('')

const isHeaderSettingsVisible = ref(false)
const headerSettingsData = ref(null)
const isTextSettingsVisible = ref(false)
const textSettingsData = ref(null)
const isChartSettingsVisible = ref(false)
const chartSettingsData = ref(null)
const isSelectorSettingsVisible = ref(false)
const selectorSettingsData = ref(null)
const dashboardGridRef = ref(null)

function getItemDefaultHeight(item) {
  if (!item || !item.type) {
    return 150
  }

  switch (item.type) {
    case 'Заголовок': {
      const sizeKey = item.size && HEADER_WIDGET_HEIGHTS[item.size] ? item.size : 'M'
      return HEADER_WIDGET_HEIGHTS[sizeKey] || 60
    }
    case 'Текст':
      return 150
    case 'Чарт':
      return 300
    case 'Селектор':
      return 50
    default:
      return 150
  }
}

const handleToolbarDragStart = (itemType) => {
            draggedType.value = itemType
}

const handleToolbarDragEnd = () => {
    draggedType.value = ''
}

const dashboardRequiredFieldsFilled = computed(() => {
    return dashboardName.value.trim().length > 0
})

function deepEqual(a, b) {
    if (a === b) return true
    if (a == null || b == null) return a === b
    if (typeof a !== 'object' || typeof b !== 'object') return false
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        return a.every((v, i) => deepEqual(v, b[i]))
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false
    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()
    if (keysA.length !== keysB.length) return false
    if (keysA.some((k, i) => k !== keysB[i])) return false
    return keysA.every(k => deepEqual(a[k], b[k]))
}

const isDashboardDirty = computed(() => {
    if (!isEditMode.value || !dashboardId.value) return true
    if (lastSavedSnapshot.value == null) return true
    const current = prepareDashboardForAPI(dashboardName.value, dashboardDescription.value)
    return !deepEqual(current, lastSavedSnapshot.value)
})

const currentPageName = computed(() => {
    return pages.value[currentPageIndex.value]?.name || 'Страница 1'
})

const displayText = computed(() => {
    if (showPageDropdown.value) {
        return 'Сменить страницу'
    }
    return headerHoverText.value || currentPageName.value
})

const currentPageItems = computed(() => {
    return dashboardItems.value[currentPageIndex.value] || []
})

const footerLeftOffset = computed(() => {
    const mainSidebarWidth = isSidebarCollapsed.value ? 120 : 260
    const biSidebarWidth = isDatasetSidebarOpen.value ? 768 : 0
    return `${mainSidebarWidth + biSidebarWidth}px`
})

const footerWidth = computed(() => {
    const mainSidebarWidth = isSidebarCollapsed.value ? 120 : 260
    const biSidebarWidth = isDatasetSidebarOpen.value ? 768 : 0
    return `calc(100% - ${mainSidebarWidth + biSidebarWidth}px)`
})

const updateCurrentPageItems = (newItems) => {
    dashboardItems.value[currentPageIndex.value] = newItems
}

const goToEditMode = () => {
    if (!canEditDashboard.value) return
    router.replace({ path: route.path, query: { ...route.query, mode: 'edit' } })
}

const handleItemSelect = (item) => {
}

const handleItemEdit = (item) => {
  if (item.type === 'Заголовок') {
    headerSettingsData.value = { ...item }
    isHeaderSettingsVisible.value = true
  } else if (item.type === 'Текст') {
    textSettingsData.value = { ...item }
    isTextSettingsVisible.value = true
  } else if (item.type === 'Чарт') {
    chartSettingsData.value = { ...item }
    isChartSettingsVisible.value = true
  } else if (item.type === 'Селектор') {
    selectorSettingsData.value = { ...item }
    isSelectorSettingsVisible.value = true
  }
}

const handleItemDelete = (item) => {
}

const saveHeaderSettings = (updatedSettings) => {
  const itemIndex = currentPageItems.value.findIndex(item => item.id === updatedSettings.id);
  if (itemIndex !== -1) {
    const oldItem = currentPageItems.value[itemIndex];
    const oldHeight = oldItem.height;
    
    if (updatedSettings.type === 'Заголовок') {
      if (updatedSettings.autoHeight) {
        updatedSettings.height = 'auto';
      } else if (updatedSettings.size) {
        updatedSettings.height = HEADER_WIDGET_HEIGHTS[updatedSettings.size] || 50;
      }
    }
    
    const newItems = [...currentPageItems.value];
    newItems[itemIndex] = updatedSettings;
    updateCurrentPageItems(newItems);
    
    const heightChanged = oldHeight !== updatedSettings.height;
    if (heightChanged && dashboardGridRef.value) {
      setTimeout(() => {
        dashboardGridRef.value.triggerRecalculatePositions();
      }, 50);
    }
  }
  closeHeaderSettings();
};

function closeHeaderSettings() {
  isHeaderSettingsVisible.value = false
  headerSettingsData.value = null
}

function closeTextSettings() {
  isTextSettingsVisible.value = false
  textSettingsData.value = null
}

function closeChartSettings() {
  isChartSettingsVisible.value = false
  chartSettingsData.value = null
}

function closeSelectorSettings() {
  isSelectorSettingsVisible.value = false
  selectorSettingsData.value = null
}

const saveTextSettings = (updatedSettings) => {
  const itemIndex = currentPageItems.value.findIndex(item => item.id === updatedSettings.id);
  if (itemIndex !== -1) {
    const oldItem = currentPageItems.value[itemIndex];
    const oldHeight = oldItem.height;
    
    if (updatedSettings.type === 'Текст') {
      if (updatedSettings.autoHeight) {
        updatedSettings.height = 'auto';
      } else {
        updatedSettings.height = 150;
      }
    }
    
    const newItems = [...currentPageItems.value];
    newItems[itemIndex] = updatedSettings;
    updateCurrentPageItems(newItems);
    
    const heightChanged = oldHeight !== updatedSettings.height;
    if (heightChanged && dashboardGridRef.value) {
      setTimeout(() => {
        dashboardGridRef.value.triggerRecalculatePositions();
      }, 50);
    }
  }
  closeTextSettings();
};

const saveChartSettings = (updatedSettings) => {
  const itemIndex = currentPageItems.value.findIndex(item => item.id === updatedSettings.id);
  if (itemIndex !== -1) {
    const oldItem = currentPageItems.value[itemIndex];
    const oldHeight = oldItem.height;
    
    if (updatedSettings.type === 'Чарт') {
      if (updatedSettings.autoHeight) {
        updatedSettings.height = 'auto';
      } else {
        updatedSettings.height = 300;
      }
    }
    
    const newItems = [...currentPageItems.value];
    newItems[itemIndex] = {
      ...updatedSettings,
      title: updatedSettings.title,
      selectedChart: updatedSettings.selectedChart,
      description: updatedSettings.description,
      showDescription: updatedSettings.showDescription,
      hint: updatedSettings.hint,
      hintText: updatedSettings.hintText,
      autoHeight: updatedSettings.autoHeight,
      filtering: updatedSettings.filtering,
      chartsList: updatedSettings.chartsList,
      activeChartIndex: updatedSettings.activeChartIndex || 0
    };
    updateCurrentPageItems(newItems);
    
    const heightChanged = oldHeight !== updatedSettings.height;
    if (heightChanged && dashboardGridRef.value) {
      setTimeout(() => {
        dashboardGridRef.value.triggerRecalculatePositions();
      }, 50);
    }
  }
  closeChartSettings();
};

const saveSelectorSettings = (updatedSettings) => {
  const itemIndex = currentPageItems.value.findIndex(item => item.id === updatedSettings.id);
  if (itemIndex !== -1) {
    const oldItem = currentPageItems.value[itemIndex];
    const oldHeight = oldItem.height;
    
    if (updatedSettings.type === 'Селектор') {
      if (updatedSettings.autoHeight) {
        updatedSettings.height = 'auto';
      } else {
        updatedSettings.height = 50;
      }
    }
    
    const newItems = [...currentPageItems.value];
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      selectorsList: updatedSettings.selectorsList,
      activeSelectorIndex: updatedSettings.activeSelectorIndex || 0,
      selectorGroupSettings: updatedSettings.selectorGroupSettings || {
        applyButton: false,
        clearButton: false,
        autoHeight: false
      }
    };
    updateCurrentPageItems(newItems);
    
    const heightChanged = oldHeight !== updatedSettings.height;
    if (heightChanged && dashboardGridRef.value) {
      setTimeout(() => {
        dashboardGridRef.value.triggerRecalculatePositions();
      }, 50);
    }
  }
  closeSelectorSettings();
};

const togglePageDropdown = () => {
    if (pages.value.length > 1) {
        showPageDropdown.value = !showPageDropdown.value
        if (showPageDropdown.value && headerLabelTextRef.value) {
            dropdownWidth.value = headerLabelTextRef.value.offsetWidth
        }
    }
}

const handleHeaderHover = () => {
    if (pages.value.length > 1) {
        isFlipping.value = true
        setTimeout(() => {
            headerHoverText.value = 'Сменить страницу'
            isFlipping.value = false
        }, 150)
    }
}

const handleHeaderLeave = () => {
    if (pages.value.length > 1) {
        isFlipping.value = true
        setTimeout(() => {
            headerHoverText.value = ''
            isFlipping.value = false
        }, 150)
    }
}

const selectPage = (index, event) => {
    event.stopPropagation()
    currentPageIndex.value = index
    showPageDropdown.value = false
}

const updateUrlForPage = (pageIndex) => {
    if (pages.value.length > 1) {
        const newQuery = { ...route.query, tab: pageIndex.toString() }
        router.replace({ query: newQuery })
    } else {
        const newQuery = { ...route.query }
        delete newQuery.tab
        router.replace({ query: newQuery })
    }
}

const initializePageFromUrl = () => {
    const tabParam = route.query.tab
    if (tabParam && pages.value.length > 1) {
        const pageIndex = parseInt(tabParam)
        if (pageIndex >= 0 && pageIndex < pages.value.length) {
            currentPageIndex.value = pageIndex
        } else {
            currentPageIndex.value = 0
            updateUrlForPage(0)
        }
    } else if (pages.value.length === 0) {
        const newQuery = { ...route.query }
        delete newQuery.tab
        router.replace({ query: newQuery })
    }
}

const handleClickOutside = (event) => {
    const headerLabelText = event.target.closest('.header-label-text')
    const pageDropdown = event.target.closest('.page-dropdown')
    
    if (!headerLabelText && !pageDropdown) {
        showPageDropdown.value = false
    }
}

let cleanupSidebarTracking = null

// Преобразование данных из API в формат компонента
function loadDashboardFromAPI(dashboardData) {
    dashboardName.value = dashboardData.name || 'Новый дашборд'
    dashboardDescription.value = dashboardData.description || ''
    dashboardId.value = dashboardData.id
    dashboardOwnerId.value = dashboardData.owner_id ?? dashboardData.owner ?? null

    // Загружаем страницы
    if (dashboardData.pages && dashboardData.pages.length > 0) {
        pages.value = dashboardData.pages.map(page => ({
            name: page.name,
            id: page.id
        }))
        
        // Загружаем элементы для каждой страницы
        dashboardItems.value = {}
        dashboardData.pages.forEach((page, index) => {
            if (page.items && page.items.length > 0) {
                dashboardItems.value[index] = page.items.map(item => ({
                    id: item.id,
                    type: item.type,
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    ...item.config
                }))
            } else {
                dashboardItems.value[index] = []
            }
        })
    } else {
        pages.value = [{ name: 'Страница 1' }]
        dashboardItems.value = { 0: [] }
    }
    lastSavedSnapshot.value = prepareDashboardForAPI(dashboardName.value, dashboardDescription.value)
    dashboardDataLoaded.value = true
}

// Преобразование данных из формата компонента в формат API
function prepareDashboardForAPI(name, description) {
    const pagesData = pages.value.map((page, pageIndex) => {
        const items = dashboardItems.value[pageIndex] || []
        return {
            name: page.name,
            order: pageIndex,
            items: items.map(item => ({
                type: item.type,
                x: Math.round(item.x || 0),
                y: Math.round(item.y || 0),
                width: Math.round(item.width || 200),
                height: Math.round(
                  typeof item.height === 'number'
                    ? item.height
                    : getItemDefaultHeight(item)
                ),
                order: items.indexOf(item),
                config: {
                    // Для заголовка
                    ...(item.type === 'Заголовок' && {
                        title: item.title,
                        size: item.size,
                        hint: item.hint,
                        hintText: item.hintText,
                        autoHeight: item.autoHeight
                    }),
                    // Для текста
                    ...(item.type === 'Текст' && {
                        content: item.content,
                        autoHeight: item.autoHeight
                    }),
                    // Для чарта
                    ...(item.type === 'Чарт' && {
                        chartsList: item.chartsList || [],
                        activeChartIndex: item.activeChartIndex || 0,
                        title: item.title,
                        description: item.description,
                        showDescription: item.showDescription,
                        hint: item.hint,
                        hintText: item.hintText,
                        autoHeight: item.autoHeight,
                        filtering: item.filtering
                    }),
                    // Для селектора
                    ...(item.type === 'Селектор' && {
                        selectorsList: item.selectorsList || [],
                        activeSelectorIndex: item.activeSelectorIndex || 0,
                        selectorGroupSettings: item.selectorGroupSettings || {},
                        autoHeight: item.autoHeight
                    })
                }
            }))
        }
    })
    
    return {
        name: name || dashboardName.value,
        description: description || dashboardDescription.value,
        pages: pagesData
    }
}

function handleSaveClick() {
    if (isEditMode.value && dashboardId.value) {
        handleSaveDashboard({ name: dashboardName.value, description: dashboardDescription.value })
    } else {
        isSaveModalVisible.value = true
    }
}

// Сохранение дашборда
async function handleSaveDashboard({ name, description }) {
    saving.value = true
    try {
        const payload = prepareDashboardForAPI(name, description)
        
        let savedDashboard
        if (isEditMode.value && dashboardId.value) {
            // Обновление существующего дашборда
            const response = await dashboardService.updateDashboard(dashboardId.value, payload)
            savedDashboard = response.data
            toast.success('Дашборд успешно обновлен')
        } else {
            // Создание нового дашборда
            const response = await dashboardService.createDashboard(payload)
            savedDashboard = response.data
            dashboardId.value = savedDashboard.id
            toast.success('Дашборд успешно создан')
            router.replace({
                name: 'DashboardPage',
                params: { id: savedDashboard.id },
                query: { mode: 'edit' }
            })
        }
        
        dashboardName.value = savedDashboard.name
        dashboardDescription.value = savedDashboard.description || ''
        lastSavedSnapshot.value = prepareDashboardForAPI(dashboardName.value, dashboardDescription.value)
        isSaveModalVisible.value = false
    } catch (error) {
        console.error('Ошибка при сохранении дашборда:', error)
        toast.error(error.response?.data?.detail || 'Ошибка при сохранении дашборда')
    } finally {
        saving.value = false
    }
}

// Загрузка дашборда
async function loadDashboard(id) {
    try {
        const response = await dashboardService.getDashboard(id)
        loadDashboardFromAPI(response.data)
    } catch (error) {
        console.error('Ошибка при загрузке дашборда:', error)
        toast.error('Не удалось загрузить дашборд')
        dashboardDataLoaded.value = true
    }
}

onMounted(async () => {
    cleanupSidebarTracking = initializeSidebarTracking()
    document.addEventListener('click', handleClickOutside)
    initializePageFromUrl()
    
    // Загружаем дашборд, если есть ID в route
    const dashboardIdFromRoute = route.params.id
    if (dashboardIdFromRoute && dashboardIdFromRoute !== 'new') {
        dashboardDataLoaded.value = false
        await loadDashboard(parseInt(dashboardIdFromRoute))
        if (!canEditDashboard.value && route.query.mode === 'edit') {
            const q = { ...route.query }
            delete q.mode
            router.replace({ path: route.path, query: q })
        }
    } else {
        dashboardId.value = null
        dashboardOwnerId.value = null
        lastSavedSnapshot.value = null
        dashboardDataLoaded.value = true
        if (!dashboardItems.value[0]) {
            dashboardItems.value[0] = []
        }
    }
})

watch(() => pages.value.length, (newLength, oldLength) => {
    if (newLength === 0) {
        const newQuery = { ...route.query }
        delete newQuery.tab
        router.replace({ query: newQuery })
    } else if (newLength === 1) {
        const newQuery = { ...route.query }
        delete newQuery.tab
        router.replace({ query: newQuery })
    } else if (newLength > 1) {
        if (currentPageIndex.value >= newLength) {
            currentPageIndex.value = newLength - 1
        }
        updateUrlForPage(currentPageIndex.value)
    }
    
    if (newLength > oldLength) {
        const newPageIndex = newLength - 1
        if (!dashboardItems.value[newPageIndex]) {
            dashboardItems.value[newPageIndex] = []
        }
    } else if (newLength < oldLength) {
        const deletedPageIndex = oldLength - 1
        if (dashboardItems.value[deletedPageIndex]) {
            delete dashboardItems.value[deletedPageIndex]
        }
        
        if (currentPageIndex.value >= newLength) {
            currentPageIndex.value = newLength - 1
        }
    }
})

watch(currentPageIndex, (newIndex) => {
    if (pages.value.length > 1) {
        updateUrlForPage(newIndex)
    }
})

onUnmounted(() => {
    if (cleanupSidebarTracking) {
        cleanupSidebarTracking()
    }
    document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.dashboard-page {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 100vh;
    padding-bottom: 80px;
}

.body-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 15px;
    flex-shrink: 0;
    position: relative;
}

.header-label-icon {
    display: flex;
    justify-content: flex-start;
    gap: 10px;
    align-items: center;
    position: relative;
    flex: 1;
}

.btn-icon-inline {
    display: inline-flex;
    vertical-align: middle;
    margin-right: 6px;
}

.header-label-text{
    position: relative;
    overflow: visible;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding: 5px;
    border-radius: 6px;
    transition: all 0.2s ease;
    
    &.clickable:hover{
        cursor: pointer;
        background-color: var(--color-hover-background);
    }
    
    &.dropdown-open{
        background-color: var(--color-hover-background);
    }
}

.page-dropdown {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    background: var(--color-primary-background);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    min-width: 150px;
    animation: dropdownFadeIn 0.2s ease;
}

.page-dropdown-item {
    padding: 10px 16px;
    cursor: pointer;
    color: var(--color-text-primary);
    font-size: 14px;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: var(--color-hover-background);
    }
    
    &.active {
        background-color: var(--color-primary);
        color: white;
    }
    
    &:first-child {
        border-radius: 8px 8px 0 0;
    }
    
    &:last-child {
        border-radius: 0 0 8px 8px;
    }
}

.header-label-pages {
    position: relative;
    overflow: hidden;
    height: 20px;
    
    .text-content {
        transition: transform 0.3s ease;
    }
    
    &.flipping .text-content {
        transform: rotateX(90deg);
    }
}

.header-label-buttons {
    display: flex;
    gap: 15px;
}

.body-content {
    flex: 1;
    position: relative;
    overflow: hidden;
    padding-top: 20px;
}

.body-footer{
    position: fixed;
    bottom: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    z-index: 1000;
}

.footer-buttons{
    border: 2.5px solid var(--color-border);
    border-radius: 6px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.border-elements {
    border-radius: 8px;
}

.elements-color {
    background-color: var(--color-primary-background);
}

@keyframes dropdownFadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.page-window-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.page-window {
    background: var(--color-primary-background);
    border-radius: 12px;
    
    &.chart-settings-window {
        max-width: 90vw;
        max-height: 90vh;
        width: 960px;
        height: 470px;
    }
    
    &.selector-settings-window {
        max-width: 90vw;
        max-height: 90vh;
        width: 870px;
        height: 640px;
    }
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    width: 600px;
    min-height: 445px;
    display: flex;
    flex-direction: column;
    overflow: visible;
}

.chart-settings-window {
    width: 965px;
    height: 550px;
    min-height: 550px;
    max-height: 550px;
}
</style>