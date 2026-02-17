<template>
    <div class="dashboard-page">
        <DashboardHeader :dashboard-name="dashboardName" :dashboard-id="dashboardId" :pages="pages" :current-page-index="currentPageIndex" :is-view-mode="isViewMode" :can-edit-dashboard="canEditDashboard" :is-edit-mode="isEditMode" :dashboard-required-fields-filled="dashboardRequiredFieldsFilled" :is-dashboard-dirty="isDashboardDirty" :is-header-buttons-ready="isHeaderButtonsReady" @select-page="onSelectPage" @go-to-edit-mode="goToEditMode" @save-click="handleSaveClick" @show-pages="isPageWindowVisible = true" @rename="onRenameClick" @delete="onDeleteClick"/>
        
        <PageWindow v-if="isPageWindowVisible" v-model="pages" @close="isPageWindowVisible = false"/>

        <div v-if="isHeaderSettingsVisible" class="page-window-overlay" @click="closeHeaderSettings">
          <div class="page-window" @click.stop>
            <HeaderSettings :data="headerSettingsData" @close="closeHeaderSettings" @save="saveHeaderSettings" />
          </div>
        </div>

        <div v-if="isTextSettingsVisible" class="page-window-overlay" @click="closeTextSettings">
          <div class="page-window" @click.stop>
            <TextSettings :data="textSettingsData" @close="closeTextSettings" @save="saveTextSettings"/>
          </div>
        </div>

        <div v-if="isChartSettingsVisible" class="page-window-overlay" @click="closeChartSettings">
          <div class="page-window chart-settings-window" @click.stop>
            <ChartSettings :data="chartSettingsData" @close="closeChartSettings" @save="saveChartSettings"/>
          </div>
        </div>
        
        <div v-if="isSelectorSettingsVisible" class="page-window-overlay" @click="closeSelectorSettings">
          <div class="page-window selector-settings-window" @click.stop>
            <SelectorSettings :key="selectorSettingsData?.id || 'new'" :data="selectorSettingsData" @close="closeSelectorSettings" @save="saveSelectorSettings"/>
          </div>
        </div>
        
        <SaveDashboardModal :visible="isSaveModalVisible" :name="dashboardName" :description="dashboardDescription" :is-edit-mode="isEditMode" :saving="saving" @close="isSaveModalVisible = false" @save="handleSaveDashboard"/>
        <NameDialogModal v-if="renameModalVisible" :visible="renameModalVisible" :model-value="dashboardName" title="Переименовать дашборд" placeholder="Введите название дашборда" @saved="onRenameSaved" @update:visible="renameModalVisible = $event"/>
        <ConfirmDialog :show="showDeleteDialog" title="Удаление дашборда" :message="deleteConfirmMessage" confirm-text="Удалить" variant="danger" :loading="deleteInProgress" @confirm="confirmDeleteDashboard" @close="showDeleteDialog = false"/>
        <ConnectionsModal
          :visible="isConnectionsModalVisible"
          :items="currentPageItems"
          :initial-item="connectionsModalItem"
          @close="closeConnectionsModal"
          @apply="handleConnectionsApply"
        />

        <div v-if="isHeaderButtonsReady" class="body-content">
            <DashboardGrid ref="dashboardGridRef" :items="currentPageItems" :dragged-type="isViewMode ? '' : draggedType" :pages-count="pages.length" :view-mode="isViewMode" @update:items="updateCurrentPageItems" @item-edit="handleItemEdit" @edit-connections="handleEditConnections"/>
        </div>
        
        <div v-if="isHeaderButtonsReady && !isViewMode" class="body-footer" :style="{ left: footerLeftOffset, width: footerWidth }">
            <div class="footer-buttons">
                <DashboardToolbar  @drag-start="handleToolbarDragStart" @drag-end="handleToolbarDragEnd"/>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DashboardToolbar from './DashboardToolbar.vue'
import DashboardHeader from './DashboardHeader.vue'
import NameDialogModal from '@/core/bi/components/NameDialogModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
import ConnectionsModal from './components/connections/ConnectionsModal.vue'
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
const renameModalVisible = ref(false)
const showDeleteDialog = ref(false)
const deleteConfirmMessage = ref('')
const deleteInProgress = ref(false)
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
const isConnectionsModalVisible = ref(false)
const connectionsModalItem = ref(null)
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

const handleToolbarDragStart = (itemType) => { draggedType.value = itemType }
const handleToolbarDragEnd = () => { draggedType.value = '' }

const dashboardRequiredFieldsFilled = computed(() => dashboardName.value.trim().length > 0)

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

const currentPageItems = computed(() => {
    return dashboardItems.value[currentPageIndex.value] || []
})

const sidebarWidthTotal = computed(() => {
    const main = isSidebarCollapsed.value ? 120 : 260
    const bi = isDatasetSidebarOpen.value ? 768 : 0
    return main + bi
})

const footerLeftOffset = computed(() => `${sidebarWidthTotal.value}px`)
const footerWidth = computed(() => `calc(100% - ${sidebarWidthTotal.value}px)`)

const updateCurrentPageItems = (newItems) => {
    dashboardItems.value[currentPageIndex.value] = newItems
}

const goToEditMode = () => {
    if (!canEditDashboard.value) return
    router.replace({ path: route.path, query: { ...route.query, mode: 'edit' } })
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

const handleEditConnections = (item) => {
  if (item.type !== 'Чарт' && item.type !== 'Селектор') return
  connectionsModalItem.value = item
  isConnectionsModalVisible.value = true
}

function closeConnectionsModal() {
  isConnectionsModalVisible.value = false
  connectionsModalItem.value = null
}

function handleConnectionsApply(updatedItems) {
  if (!Array.isArray(updatedItems) || updatedItems.length === 0) {
    closeConnectionsModal()
    return
  }
  dashboardItems.value[currentPageIndex.value] = updatedItems
  closeConnectionsModal()
}

function applyItemSettingsUpdate(updatedSettings, mergeItem) {
    const itemIndex = currentPageItems.value.findIndex(item => item.id === updatedSettings.id)
    if (itemIndex === -1) return
    const oldItem = currentPageItems.value[itemIndex]
    const oldHeight = oldItem.height
    const mergedItem = mergeItem(updatedSettings, oldItem)
    const newItems = [...currentPageItems.value]
    newItems[itemIndex] = mergedItem
    updateCurrentPageItems(newItems)
    if (oldHeight !== mergedItem.height && dashboardGridRef.value) {
        setTimeout(() => dashboardGridRef.value.triggerRecalculatePositions(), 50)
    }
}

const saveHeaderSettings = (updatedSettings) => {
  if (updatedSettings.type === 'Заголовок') {
    if (updatedSettings.autoHeight) updatedSettings.height = 'auto'
    else if (updatedSettings.size) updatedSettings.height = HEADER_WIDGET_HEIGHTS[updatedSettings.size] || 50
  }
  applyItemSettingsUpdate(updatedSettings, (s) => s)
  closeHeaderSettings()
}

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
  if (updatedSettings.type === 'Текст') {
    updatedSettings.height = updatedSettings.autoHeight ? 'auto' : 150
  }
  applyItemSettingsUpdate(updatedSettings, (s) => s)
  closeTextSettings()
}

const saveChartSettings = (updatedSettings) => {
  if (updatedSettings.type === 'Чарт') {
    if (updatedSettings.autoHeight) {
      updatedSettings.height = 'auto'
    } else {
      const oldHeight = currentPageItems.value.find(i => i.id === updatedSettings.id)?.height
      const keepHeight = typeof oldHeight === 'number' && oldHeight > 0
      const fromGrid = dashboardGridRef.value?.getResolvedHeight?.(updatedSettings.id)
      const fallback = typeof fromGrid === 'number' && fromGrid > 0 ? fromGrid : 300
      updatedSettings.height = keepHeight ? oldHeight : fallback
    }
  }
  const merged = {
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
  }
  applyItemSettingsUpdate(updatedSettings, () => merged)
  closeChartSettings()
}

const saveSelectorSettings = (updatedSettings) => {
  const groupSettings = updatedSettings.selectorGroupSettings || { applyButton: false, clearButton: false, autoHeight: false }
  const autoHeight = groupSettings.autoHeight ?? updatedSettings.autoHeight ?? false
  applyItemSettingsUpdate(updatedSettings, (s, old) => {
    const merged = {
      ...old,
      selectorsList: s.selectorsList,
      activeSelectorIndex: s.activeSelectorIndex || 0,
      selectorGroupSettings: groupSettings,
      autoHeight
    }
    if (!autoHeight && (merged.height == null || merged.height === 'auto')) {
      merged.height = 160
    }
    return merged
  })
  closeSelectorSettings()
}

function onSelectPage(idx) {
    currentPageIndex.value = idx
}

function replaceQueryTab(tab) {
    const q = { ...route.query }
    if (tab != null) q.tab = String(tab)
    else delete q.tab
    router.replace({ query: q })
}

const updateUrlForPage = (pageIndex) => {
    replaceQueryTab(pages.value.length > 1 ? pageIndex : null)
}

const initializePageFromUrl = () => {
    const tabParam = route.query.tab
    if (tabParam && pages.value.length > 1) {
        const pageIndex = parseInt(tabParam)
        if (pageIndex >= 0 && pageIndex < pages.value.length) {
            currentPageIndex.value = pageIndex
        } else {
            currentPageIndex.value = 0
            replaceQueryTab(0)
        }
    } else if (pages.value.length === 0) {
        replaceQueryTab(null)
    }
}

let cleanupSidebarTracking = null

function onRenameClick() {
    renameModalVisible.value = true
}

async function onRenameSaved({ name }) {
    if (!dashboardId.value || !name?.trim()) return
    try {
        await dashboardService.patchDashboard(dashboardId.value, { name })
        dashboardName.value = name.trim()
        toast.success('Дашборд переименован')
        renameModalVisible.value = false
    } catch (err) {
        toast.error(err.response?.data?.detail || 'Не удалось переименовать дашборд')
    }
}

function onDeleteClick() {
    const name = dashboardName.value || 'Дашборд'
    deleteConfirmMessage.value = `Вы уверены, что хотите удалить дашборд "${name}"? Это действие нельзя отменить.`
    showDeleteDialog.value = true
}

async function confirmDeleteDashboard() {
    if (!dashboardId.value) return
    deleteInProgress.value = true
    try {
        await dashboardService.deleteDashboard(dashboardId.value)
        router.push('/bi')
    } finally {
        deleteInProgress.value = false
        showDeleteDialog.value = false
    }
}

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
                    ...(item.type === 'Заголовок' && {
                        title: item.title,
                        size: item.size,
                        hint: item.hint,
                        hintText: item.hintText,
                        autoHeight: item.autoHeight,
                        textColor: item.textColor,
                        background: item.background
                    }),
                    ...(item.type === 'Текст' && {
                        content: item.content,
                        autoHeight: item.autoHeight,
                        textColor: item.textColor,
                        background: item.background
                    }),
                    ...(item.type === 'Чарт' && {
                        chartsList: item.chartsList || [],
                        activeChartIndex: item.activeChartIndex || 0,
                        title: item.title,
                        description: item.description,
                        showDescription: item.showDescription,
                        hint: item.hint,
                        hintText: item.hintText,
                        autoHeight: item.autoHeight,
                        filtering: item.filtering,
                        incomingLinks: item.incomingLinks || []
                    }),
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
    if (newLength <= 1) {
        replaceQueryTab(null)
    }
    if (newLength > 1) {
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
})
</script>

<style scoped lang="scss">
.dashboard-page {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    min-height: 100vh;
    padding-bottom: 80px;
}

.body-content {
    flex: 1;
    position: relative;
    overflow: visible;
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
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    width: 600px;
    min-height: 445px;
    display: flex;
    flex-direction: column;
    overflow: visible;

    &.chart-settings-window {
        max-width: 90vw;
        max-height: 90vh;
        width: 965px;
        height: 550px;
        min-height: 550px;
    }

    &.selector-settings-window {
        max-width: 90vw;
        max-height: 90vh;
        width: 870px;
        height: 640px;
    }
}
</style>