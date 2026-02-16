<template>
  <div class="scrollable-table">
    <table class="custom-table">
      <thead class="transparent-header">
        <tr>
          <th v-for="col in props.cols" :key="col.key">
            {{ col.label }}
            <span v-if="col.key === 'name'" class="items-count">
              ({{ totalItemsCount }})
              <span v-if="favoritesInCurrentList > 0" class="favorites-count">
                • {{ favoritesInCurrentList }} в избранном
              </span>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in sortedUsers" :key="row.id" class="table-row" :class="{ favorite: isFavorite(row.id), 'force-hover': isRowMenuActive(row.id) }" @mouseenter="onRowMouseEnter(row.id)" @mouseleave="onRowMouseLeave(row.id)" @click="handleRowClick(row)">
          <td v-for="col in props.cols" :key="col.key" :style="{ position: 'relative', overflow: 'hidden' }" :class="{ 'td-actions': col.key === 'actions' }">
            <template v-if="col.key === 'name'">
              <template v-if="getIconComponent(row)">
                <component v-if="typeof getIconComponent(row).src === 'object' || typeof getIconComponent(row).src === 'function'" :is="getIconComponent(row).src" class="icon" :style="getIconComponent(row).color ? { color: getIconComponent(row).color } : undefined" @mouseenter="onIconHover($event, getIconComponent(row).tooltip)" @mouseleave="hideTooltip" />
                <img v-else :src="getIconComponent(row).src" class="icon" @mouseenter="onIconHover($event, getIconComponent(row).tooltip)" @mouseleave="hideTooltip" />
              </template>
              <template v-else><Table class="icon" /></template>
              <span class="dataset-name">{{ getValue(row, col.key) ?? '—' }}</span>
              <TriangleAlert v-if="shouldShowFileWarning(row)" class="alert-icon" :size="16"  @mouseenter="onIconHover($event, getFileWarningTooltip(row), 'error-tooltip')" @mouseleave="hideTooltip"/>
            </template>

            <template v-else-if="col.key === 'created_at'">
              <span class="tooltip-wrapper" @mouseenter="onIconHover($event, formatTooltipDate(getValue(row, col.key)))" @mouseleave="hideTooltip">
                {{ new Date(getValue(row, col.key)).toLocaleDateString() }}
              </span>
            </template>

            <template v-else-if="col.key === 'actions'">
              <div v-if="hasBeenOpened" class="actions-cell" :class="{ visible: isRowMenuActive(row.id) || isFavorite(row.id) }">
                <div class="actions-inner">
                  <button class="action-btn star" :class="{ active: isFavorite(row.id) }" @click.stop="toggleFavorite(row.id)" title="Избранное">
                    <Star class="icon-inline" />
                  </button>
                  <button class="action-btn more" :class="{ visible: isRowMenuActive(row.id), 'force-hover': showMenu && menuRowId === row.id }" @click="onMoreClick($event, row.id)" title="Еще">
                    <MoreHorizontal class="icon-inline" />
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              {{ typeof col.format === 'function' ? col.format(getValue(row, col.key)) : getValue(row, col.key) ?? '—' }}
            </template>
          </td>
        </tr>
        <tr v-if="totalItemsCount === 0"><td :colspan="props.cols.length" class="no-data">Нет данных</td></tr>
      </tbody>
    </table>

    <teleport to="body">
      <div v-if="showTooltip" class="tooltip-fixed" :class="tooltipClass" :style="tooltipStyle">{{ tooltipText }}</div>
    </teleport>

    <teleport to="body">
      <Transition name="dropdown-menu">
        <div v-if="showMenu" ref="menuDropdownRef" class="menu-dropdown" :style="menuPosition">
          <div class="menu-item" @click="openRename(getRowById(menuRowId))"><CaseSensitive :size="18" :stroke-width="2" />Переименовать</div>
          <div class="menu-item" @click="copyLink(getRowById(menuRowId))"><Link :size="18" :stroke-width="2" />Копировать ссылку</div>
          <div class="menu-item danger" @click="askDelete(getRowById(menuRowId))"><Trash2 :size="18" :stroke-width="2" />Удалить</div>
        </div>
      </Transition>
    </teleport>
  </div>

  <teleport to="body">
    <ConfirmDialog :show="showDeleteDialog" title="Подтверждение удаления" :message="deleteConfirmMessage" confirm-text="Да" cancel-text="Нет" variant="danger" @confirm="confirmDelete" @cancel="cancelDelete" @close="cancelDelete"/>
  </teleport>

  <teleport to="body">
    <ModalCenter v-if="showRenameDialog" modal-id="renameElementModal" title="Укажите новое название элементу" custom-class="show d-block" @closemodal="cancelRename">
      <input id="rename-input" class="form-control" v-model="renameValue" :disabled="renameLoading" maxlength="128" @keyup.enter="doRename" style="margin-bottom: 1rem; width: 100%; font-size: 1.05rem;" autocomplete="off"/>
      <div v-if="renameError" class="text-danger mb-3">{{ renameError }}</div>
      <div class="d-flex gap-3">
        <button type="button" class="btn btn-primary" @click="doRename" :disabled="renameLoading || !renameValue.trim()">Сохранить</button>
        <button type="button" class="btn btn-secondary" @click="cancelRename" :disabled="renameLoading">Отмена</button>
      </div>
    </ModalCenter>
    <div v-if="showRenameDialog" class="modal-backdrop fade show" @click="cancelRename"></div>
  </teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { Star, MoreHorizontal, Trash2, CaseSensitive, Link, Database, TriangleAlert, Table, LayoutDashboard } from 'lucide-vue-next'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ModalCenter from '@/components/ModalCenter.vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/js/api/manager.js'
import { getChartTypeIcon, getChartTypeLabel, getChartTypeColor } from '@/core/bi/Charts/js/chartTypeIcons.js'
import ClickHouseIcon from '@/core/bi/assets/icons/clickhouse.svg'
import PostgresIcon from '@/core/bi/assets/icons/postgres.svg'
import MssqlIcon from '@/core/bi/assets/icons/mssql.svg'
import FileIcon from '@/core/bi/assets/icons/folder_windows_style.svg'

const props = defineProps({
  cols: Array,
  users: Array,
  isDatasetSidebarOpen: Boolean,
  currentPage: String
})

const hasBeenOpened = ref(false)
const hoveredRow = ref(null)
const favorites = ref(new Set())

const totalItemsCount = computed(() => {
  return Array.isArray(props.users) ? props.users.length : 0
})

const sortedUsers = computed(() => {
  if (!props.users) return []
  return [...props.users].sort((a, b) => {
    const aIsFavorite = isFavorite(a.id)
    const bIsFavorite = isFavorite(b.id)
    if (aIsFavorite && !bIsFavorite) return -1
    if (!aIsFavorite && bIsFavorite) return 1
    if (aIsFavorite === bIsFavorite) {
      const aDate = new Date(a.created_at || 0)
      const bDate = new Date(b.created_at || 0)
      return bDate - aDate
    }
    return 0
  })
})

const favoritesInCurrentList = computed(() => {
  if (!props.users) return 0
  return props.users.filter(user => isFavorite(user.id)).length
})

const favoritesStorageKey = computed(() => `favorite${props.currentPage.charAt(0).toUpperCase() + props.currentPage.slice(1)}`)

const showDeleteDialog = ref(false)
const rowToDelete = ref(null)
const deleteConfirmMessage = computed(() => {
  if (!rowToDelete.value) return ''
  const name = rowToDelete.value?.name || rowToDelete.value?.original_filename || 'элемент'
  const typeName = getTypeName(rowToDelete.value)
  return `Вы действительно хотите удалить "${name}" (${typeName})?`
})

const showRenameDialog = ref(false)
const rowToRename = ref(null)
const renameValue = ref('')
const renameLoading = ref(false)
const renameError = ref('')

const toast = useToast()
const router = useRouter()
const connectionFilesStatus = ref(new Map())
const connectionFilesCache = ref(new Map())
const lastCacheUpdate = ref(0)
const CACHE_DURATION = 30000

function handleRowClick(row) {
  if (props.currentPage === 'datasets') {
    goToDataset(row)
  } else if (props.currentPage === 'connections') {
    goToConnection(row)
  } else if (props.currentPage === 'charts') {
    goToChart(row)
  } else if (props.currentPage === 'dashboards') {
    goToDashboard(row)
  }
}

function getConnectionType(row) {
  return (row?.connector_type_display || row?.connector_type || '').toLowerCase().trim()
}

function isFileConnectionType(type) {
  return type === 'file' || type === 'files' || type === 'файл' || type === 'файлы' ||
    type.includes('file') || type.includes('файл')
}

function goToConnection(row) {
  if (!row || !row.id) return
  const type = getConnectionType(row)
  if (isFileConnectionType(type)) {
    router.push(`/bi/connections/${row.id}/files/`)
  } else {
    router.push(`/bi/connections/${row.id}/`)
  }
}

function goToDataset(row) {
  if (!row || !row.id) return
  router.push(`/bi/datasets/${row.id}/sources`)
}

function goToChart(row) {
  if (!row || !row.id) return
  router.push(`/bi/chart/${row.id}/`)
}

function goToDashboard(row) {
  if (!row || !row.id) return
  router.push(`/bi/dashboard/${row.id}/`)
}

function loadFavorites() {
  favorites.value.clear()
  const raw = localStorage.getItem(favoritesStorageKey.value)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      favorites.value = new Set(Array.isArray(parsed) ? parsed.map((x) => String(x)) : [])
    } catch {
      favorites.value = new Set()
    }
  }
}

function saveFavorites() {
  localStorage.setItem(favoritesStorageKey.value, JSON.stringify([...favorites.value]))
}

function toggleFavorite(id) {
  const key = String(id)
  if (favorites.value.has(key)) {
    favorites.value.delete(key)
  } else {
    favorites.value.add(key)
  }
  saveFavorites()
}

function isFavorite(id) {
  return favorites.value.has(String(id))
}

onMounted(loadFavorites)
watch(() => props.currentPage, loadFavorites, { immediate: true })

watch(() => props.isDatasetSidebarOpen, (newValue) => {
  if (newValue && !hasBeenOpened.value) {
    hasBeenOpened.value = true
  }
}, { immediate: true })

watch(() => props.users, loadAllConnectionFilesStatus, { immediate: true })

function getValue(row, key) {
  return key.split('.').reduce((acc, part) => acc?.[part], row)
}

const tooltipText = ref('')
const tooltipStyle = ref({ top: '0px', left: '0px' })
const tooltipClass = ref('')
const showTooltip = ref(false)

const emit = defineEmits(['delete-row'])

function onRowMouseEnter(rowId) {
  hoveredRow.value = rowId
}

function onRowMouseLeave(rowId) {
  if (showMenu.value && menuRowId.value === rowId) return
  hoveredRow.value = null
}

function isRowMenuActive(rowId) {
  return hoveredRow.value === rowId || (showMenu.value && menuRowId.value === rowId)
}

function onIconHover(event, text, cssClass = '') {
  tooltipText.value = text
  tooltipClass.value = cssClass
  showTooltip.value = true
  const rect = event.target.getBoundingClientRect()
  tooltipStyle.value = {
    top: `${rect.top + window.scrollY - 32}px`,
    left: `${rect.left + rect.width / 2 + window.scrollX}px`
  }
}

function hideTooltip() {
  showTooltip.value = false
  tooltipClass.value = ''
}

function getIconComponent(row) {
  const type = getConnectionType(row)

  if (props.currentPage === 'charts') {
    return {
      src: getChartTypeIcon(row.chart_type),
      tooltip: getChartTypeLabel(row.chart_type),
      color: getChartTypeColor(row.chart_type)
    }
  }
  if (props.currentPage === 'datasets') {
    return { src: Database, tooltip: 'Датасет' }
  }
  if (props.currentPage === 'dashboards') {
    return { src: LayoutDashboard, tooltip: 'Дашборд' }
  }

  if (type.includes('clickhouse')) return { src: ClickHouseIcon, tooltip: 'ClickHouse' }
  if (type.includes('postgres')) return { src: PostgresIcon, tooltip: 'PostgreSQL' }
  if (type.includes('sql server') || type.includes('mssql')) return { src: MssqlIcon, tooltip: 'Microsoft SQL Server' }
  if (isFileConnectionType(type)) return { src: FileIcon, tooltip: 'Загруженные файлы' }

  return null
}

function formatTooltipDate(dateStr) {
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  const date = new Date(dateStr)
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const showMenu = ref(false)
const menuPosition = ref({ top: '0px', left: '0px' })
const menuRowId = ref(null)
const menuDropdownRef = ref(null)

function onMoreClick(event, rowId) {
  event.stopPropagation()
  if (showMenu.value && menuRowId.value === rowId) {
    showMenu.value = false
    return
  }
  const rect = event.currentTarget.getBoundingClientRect()
  showMenu.value = true
  menuRowId.value = rowId
  menuPosition.value = {
    top: `${rect.bottom + window.scrollY + 6}px`,
    left: `${rect.left + window.scrollX}px`
  }
  hoveredRow.value = rowId
}

function closeMenu() {
  showMenu.value = false
}

function handleClickOutside(event) {
  if (event.target.closest?.('.action-btn.more')) return
  if (!menuDropdownRef.value?.contains(event.target)) {
    closeMenu()
  }
}

watch(showMenu, (open) => {
  if (open) {
    nextTick(() => document.addEventListener('mousedown', handleClickOutside))
  } else {
    document.removeEventListener('mousedown', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

function getTypeName(row) {
  if (!row) return ''
  if (props.currentPage === 'datasets') return 'датасет'
  if (props.currentPage === 'connections') return 'подключение'
  if (props.currentPage === 'charts') return 'чарт'
  if (props.currentPage === 'dashboards') return 'дашборд'
  return ''
}

function getRowApiPath(row) {
  if (props.currentPage === 'connections' || row?.type === 'connection') return `/bi_analysis/bi_connections/${row.id}/`
  if (props.currentPage === 'charts' || row?.type === 'chart') return `/bi_analysis/bi_charts/${row.id}/`
  if (props.currentPage === 'dashboards' || row?.type === 'dashboard') return `/bi_analysis/bi_dashboards/${row.id}/`
  return `/bi_analysis/bi_datasets/${row.id}/`
}

function getDeleteEndpoint(row) {
  return getRowApiPath(row)
}

async function confirmDelete() {
  if (!rowToDelete.value) return
  const endpoint = getDeleteEndpoint(rowToDelete.value)
  try {
    const res = await apiClient.delete(endpoint)
    if (res.success) {
      emit('delete-row', rowToDelete.value)
      closeMenu()
      toast.success('Элемент успешно удалён')
    } else {
      toast.error('Ошибка при удалении: ' + (res.message || ''))
    }
  } catch (err) {
    toast.error('Ошибка при удалении: ' + err)
  } finally {
    cancelDelete()
  }
}

function askDelete(row) {
  rowToDelete.value = row
  showDeleteDialog.value = true
}

function cancelDelete() {
  showDeleteDialog.value = false
  rowToDelete.value = null
}

function getRowById(id) {
  return props.users.find(u => u.id === id)
}

function cancelRename() {
  showRenameDialog.value = false
  rowToRename.value = null
  renameValue.value = ''
  renameLoading.value = false
  renameError.value = ''
}

async function doRename() {
  if (!renameValue.value.trim()) {
    renameError.value = 'Имя не может быть пустым'
    return
  }
  renameLoading.value = true
  renameError.value = ''
  const row = rowToRename.value
  const endpoint = getRowApiPath(row)
  const payload = { name: renameValue.value }

  try {
    const res = await apiClient.patch(endpoint, payload)
    if (res.success !== false) {
      const rowInList = props.users.find(u => u.id === row.id)
      if (rowInList) rowInList.name = renameValue.value
      toast.success('Элемент успешно переименован')
      cancelRename()
    } else {
      const msg = res.message || 'Не удалось переименовать'
      renameError.value = 'Ошибка: ' + msg
      toast.error('Ошибка при переименовании: ' + msg)
    }
  } catch (e) {
    renameError.value = 'Ошибка: ' + e
    toast.error('Ошибка при переименовании: ' + e)
  } finally {
    renameLoading.value = false
  }
}

function openRename(row) {
  rowToRename.value = row
  renameValue.value = row.name || row.original_filename || ''
  renameError.value = ''
  showRenameDialog.value = true
  closeMenu()
  setTimeout(() => {
    document.getElementById('rename-input')?.focus()
  }, 100)
}

function getCopyLink(row) {
  if (props.currentPage === 'connections') return `${window.location.origin}/bi/connections/${row.id}/`
  if (props.currentPage === 'datasets') return `${window.location.origin}/bi/datasets/${row.id}/`
  if (props.currentPage === 'charts') return `${window.location.origin}/bi/chart/${row.id}/`
  if (props.currentPage === 'dashboards') return `${window.location.origin}/bi/dashboard/${row.id}/`
  return window.location.href
}

async function copyLink(row) {
  try {
    await navigator.clipboard.writeText(getCopyLink(row))
    toast.success('Ссылка успешно скопирована в буфер обмена')
  } catch (err) {
    toast.error('Не удалось скопировать ссылку: ' + err.message)
  }
  closeMenu()
}

function shouldShowFileWarning(connection) {
  if (!connection) return false
  const type = getConnectionType(connection)
  if (isFileConnectionType(type)) {
    return connection.hasMissingFiles || connection.hasProblematicFiles
  }
  return false
}

function getFileWarningTooltip(connection) {
  if (!connection) return ''
  const type = getConnectionType(connection)
  if (isFileConnectionType(type)) {
    if (connection.hasProblematicFiles) {
      return 'Возникла проблема с одним из файлов в подключении'
    }
    if (connection.hasMissingFiles) {
      return 'В подключении отсутствуют файлы'
    }
  }
  
  return 'Проблема с подключением'
}

async function loadConnectionFilesStatus(connectionId) {
  // Проверяем кэш
  const cached = connectionFilesCache.value.get(connectionId)
  if (cached) {
    connectionFilesStatus.value.set(connectionId, cached)
    return
  }
  
  try {
    const res = await apiClient.get(`bi_analysis/bi_datasets/connection/${connectionId}/files/`)
    
    if (res.success && res.data) {
      const files = Array.isArray(res.data) ? res.data : []
      
      const hasMissingFiles = files.length === 0
      
      const hasProblematicFiles = files.some(file => {
        return file.missing === true || 
               file.exists === false || 
               file.file_not_found === true ||
               file.status === 'missing' ||
               file.status === 'not_found' ||
               file.status === 'error' ||
               !file.file_path ||
               file.error
      })
      
      const status = {
        hasMissingFiles,
        hasProblematicFiles,
        filesCount: files.length
      }
      
      connectionFilesStatus.value.set(connectionId, status)
      connectionFilesCache.value.set(connectionId, status)
    }
  } catch (error) {
    console.warn(`Не удалось загрузить статус файлов для подключения ${connectionId}:`, error)
  }
}

async function loadAllConnectionFilesStatus() {
  if (props.currentPage !== 'connections') return
  const fileConnections = props.users.filter(row => isFileConnectionType(getConnectionType(row)))
  
  const now = Date.now()
  const needsUpdate = now - lastCacheUpdate.value > CACHE_DURATION
  
  // Если кэш актуален, используем его
  if (!needsUpdate && connectionFilesCache.value.size > 0) {
    fileConnections.forEach(connection => {
      const cached = connectionFilesCache.value.get(connection.id)
      if (cached) {
        connectionFilesStatus.value.set(connection.id, cached)
      }
    })
    return
  }
  
  // Пытаемся загрузить все статусы одним запросом
  try {
    const res = await apiClient.get('bi_analysis/bi_connections/files-status/')
    if (res.success && res.data) {
      // Обновляем статусы из ответа
      Object.entries(res.data).forEach(([connectionId, status]) => {
        const id = parseInt(connectionId)
        connectionFilesStatus.value.set(id, status)
        connectionFilesCache.value.set(id, status)
      })
      
      lastCacheUpdate.value = now
      return
    }
  } catch (error) {
    console.warn('Не удалось загрузить статусы файлов одним запросом, используем старый метод:', error)
  }
  
  // Fallback: загружаем по одному (старый метод)
  const connectionsToLoad = needsUpdate ? fileConnections : 
    fileConnections.filter(conn => !connectionFilesCache.value.has(conn.id))
  
  if (connectionsToLoad.length === 0) return
  
  // Ограничиваем количество одновременных запросов
  const BATCH_SIZE = 5
  const batches = []
  for (let i = 0; i < connectionsToLoad.length; i += BATCH_SIZE) {
    batches.push(connectionsToLoad.slice(i, i + BATCH_SIZE))
  }
  
  // Загружаем батчами с небольшой задержкой между ними
  for (const batch of batches) {
    const promises = batch.map(connection => 
      loadConnectionFilesStatus(connection.id)
    )
    
    await Promise.allSettled(promises)
    
    // Небольшая задержка между батчами
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // Обновляем кэш
  lastCacheUpdate.value = now
  connectionFilesStatus.value.forEach((status, id) => {
    connectionFilesCache.value.set(id, status)
  })
}

// Функция для принудительной очистки кэша (можно вызвать при обновлении данных)
function clearConnectionFilesCache() {
  connectionFilesCache.value.clear()
  lastCacheUpdate.value = 0
}

defineExpose({
  clearConnectionFilesCache
})
</script>

<style scoped lang="scss">
.scrollable-table {
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 115px - 2rem);
  font-size: 14px;
  color: var(--color-primary-text);
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 12px;
}

.transparent-header th {
  background-color: transparent;
  color: var(--color-secondary-text);
  font-weight: bold;
}

.custom-table th,
.custom-table td {
  padding: 12px 16px;
  text-align: left;
  white-space: nowrap;
}

.table-row {
  transition: all 0.3s ease;
  animation: fadeInUp 0.3s ease;
}

.table-row:hover,
.table-row.force-hover {
  background-color: var(--color-hover-background);
  cursor: pointer;
}

.table-row.favorite {
  background-color: rgba(250, 204, 21, 0.05);
  border-left: 3px solid #facc15;
}

.table-row.favorite:hover {
  background-color: rgba(250, 204, 21, 0.1);
}

.table-row.favorite + .table-row:not(.favorite) {
  border-top: 2px solid rgba(250, 204, 21, 0.2);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.td-actions {
  width: 96px;
  max-width: 96px;
  min-width: 96px;
  padding: 0 4px;
}

.icon {
  width: 24px;
  height: 24px;
  margin-right: 5px;
  vertical-align: middle;
  color: var(--color-accent);
}

.tooltip-wrapper {
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
}

.tooltip-fixed {
  position: fixed;
  transform: translateX(-50%);
  background-color: var(--color-primary-background);
  color: var(--color-primary-text);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.tooltip-fixed.error-tooltip {
  border: 1px solid var(--color-accent);
}

.dataset-name {
  vertical-align: middle;
}

.alert-icon {
  color: var(--color-accent);
  cursor: pointer;
  margin-left: 8px;
  vertical-align: middle;
  transition: color 0.2s ease;
}

.alert-icon:hover {
  color: #ff5252;
}

.no-data {
  text-align: center;
  padding: 24px;
  color: #777;
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform: translateY(-4px);
}

.actions-cell.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.actions-cell .action-btn.star.active {
  opacity: 1 !important;
  pointer-events: auto !important;
}

.actions-inner {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #bbb;
  transition: background 0.2s ease, color 0.2s ease;
}

.action-btn:hover {
  background-color: var(--color-background);
  color: var(--color-primary-text);
}

.action-btn.more.force-hover {
  background-color: var(--color-background);
  color: var(--color-primary-text);
}

.action-btn.star {
  opacity: 1;
  pointer-events: auto;
  transition: all 0.2s ease;
}

.action-btn.star:hover {
  transform: scale(1.1);
}

.action-btn.star.active {
  color: #facc15;
  animation: starPop 0.3s ease;
  opacity: 1 !important;
  pointer-events: auto !important;
}

@keyframes starPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.action-btn.more {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.action-btn.more.visible {
  opacity: 1;
  pointer-events: auto;
}

.icon-inline {
  width: 18px;
  height: 18px;
}

.dropdown-menu-enter-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.dropdown-menu-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

.dropdown-menu-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-menu-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.menu-dropdown {
  position: fixed;
  min-width: 140px;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border, #dee2e6);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 10000;
}

.menu-dropdown .menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  font-size: 14px;
  border: none;
  background: none;
  color: var(--color-primary-text);
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.menu-dropdown .menu-item:hover {
  background: var(--color-hover-background);
}

.menu-dropdown .menu-item.danger:hover {
  color: var(--color-danger, #dc3545);
}

.item-name {
  font-weight: bold;
  color: #f87171;
  margin: 0 0.3em;
  word-break: break-all;
}
</style>