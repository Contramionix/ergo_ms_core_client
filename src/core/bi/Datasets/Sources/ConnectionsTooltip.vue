<template>
    <div class="list-main">
        <input class="form-control mb-2" type="text" placeholder="Фильтр по имени" v-model="filter" />
        <ul class="connection-list">
            <li v-if="isLoading" v-for="n in 3" :key="'skeleton-' + n" class="connection-item loading-placeholder">
                <div class="connection-left">
                    <div class="skeleton-icon"></div>
                    <div class="skeleton-text"></div>
                </div>
                <div class="skeleton-date"></div>
            </li>
            <li v-for="item in filteredUsers" :key="item.id" class="connection-item" :class="{ selected: isSelected(item), problematic: isProblematicConnection(item) }" v-show="!isLoading" @click="handleConnectionClick(item)">
                <div class="connection-left">
                    <img :src="getIconComponent(item)?.src" class="icon" @mouseenter="onIconHover($event, getIconComponent(item)?.tooltip)" @mouseleave="hideTooltip"/>
                    <span class="connection-name">{{ item.name }}</span>
                    <TriangleAlert 
                        v-if="shouldShowFileWarning(item)" 
                        class="alert-icon" 
                        :size="16" 
                        @mouseenter="onIconHover($event, getFileWarningTooltip(item), 'error-tooltip')"
                        @mouseleave="hideTooltip"
                    />
                </div>
                <div class="connection-date">
                    {{ new Date(item.created_at).toLocaleDateString() }}
                </div>
            </li>
            <li v-if="!isLoading && filteredUsers.length === 0" class="no-data">Нет данных</li>
        </ul>
    </div>
    <div v-if="showTooltip" class="tooltip-fixed" :class="tooltipClass" :style="tooltipStyle">
        {{ tooltipText }}
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import ClickHouseIcon from '@/core/bi/assets/icons/clickhouse.svg'
import PostgresIcon from '@/core/bi/assets/icons/postgres.svg'
import MssqlIcon from '@/core/bi/assets/icons/mssql.svg'
import FileIcon from '@/core/bi/assets/icons/folder_windows_style.svg'
import { TriangleAlert } from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager.js'

const emit = defineEmits(['select'])

const props = defineProps({
  selectedConnection: Object
})

function isSelected (row) {
    return props.selectedConnection && String(row.id) === String(props.selectedConnection.id)
}

const users = ref([])
const filter = ref('')
const isLoading = ref(true)

const tooltipText = ref('')
const tooltipStyle = ref({ top: '0px', left: '0px' })
const tooltipClass = ref('')
const showTooltip = ref(false)

const connectionFilesStatus = ref(new Map())

onMounted(async () => {
    isLoading.value = true
    const res = await apiClient.get('bi_analysis/bi_connections/')
    if (res.success) {
        users.value = res.data
        await loadAllConnectionFilesStatus()
    } else {
        console.error('Ошибка при получении подключений:', res.errors)
    }
    isLoading.value = false
})

watch(() => users.value, loadAllConnectionFilesStatus, { immediate: true })

const filteredUsers = computed(() =>
    users.value.filter((u) =>
        u.name?.toLowerCase().includes(filter.value.toLowerCase())
    )
)

function getIconComponent(row) {
  const type = (row.connector_type_display || row.connector_type || '').toLowerCase().trim()
  if (type.includes('clickhouse')) return { src: ClickHouseIcon, tooltip: 'ClickHouse' }
  if (type.includes('postgres')) return { src: PostgresIcon, tooltip: 'PostgreSQL' }
  if (type.includes('sql server') || type.includes('mssql')) return { src: MssqlIcon, tooltip: 'Microsoft SQL Server' }
  if (type.includes('file') || type.includes('файл')) return { src: FileIcon, tooltip: 'Файлы' }
  return null
}

function onIconHover(event, text, cssClass = '') {
    const target = event?.target
    if (!target || !document.body.contains(target)) return

    tooltipText.value = text
    tooltipClass.value = cssClass
    showTooltip.value = true

    const rect = target.getBoundingClientRect()
    tooltipStyle.value = {
        top: `${rect.top + window.scrollY - 32}px`,
        left: `${rect.left + rect.width / 2 + window.scrollX}px`
    }
}

function hideTooltip() {
    showTooltip.value = false
    tooltipClass.value = ''
}

function isProblematicConnection(row) {
    if (!shouldShowFileWarning(row)) return false
    
    const filesStatus = connectionFilesStatus.value.get(row.id)
    return filesStatus && (filesStatus.hasMissingFiles || filesStatus.hasProblematicFiles)
}

function handleConnectionClick(item) {
    if (isProblematicConnection(item)) {
        return
    }
    
    emit('select', item)
}

function shouldShowFileWarning(row) {
    const type = (row.connector_type_display || row.connector_type || '').toLowerCase().trim()
    
    const isFileConnection = type === 'file' || 
                             type === 'files' || 
                             type === 'файл' || 
                             type === 'файлы' ||
                             type.includes('file') || 
                             type.includes('файл')
    
    if (!isFileConnection) return false
    
    const filesStatus = connectionFilesStatus.value.get(row.id)
    
    if (!filesStatus) return false
    
    return filesStatus.hasMissingFiles || filesStatus.hasProblematicFiles
}

function getFileWarningTooltip(row) {
    const filesStatus = connectionFilesStatus.value.get(row.id)
    
    if (!filesStatus) return 'В подключении отсутствуют файлы'
    
    if (filesStatus.hasProblematicFiles) {
        return 'Возникла проблема с одним из файлов в подключении'
    }
    
    if (filesStatus.hasMissingFiles) {
        return 'В подключении отсутствуют файлы'
    }
    
    return 'В подключении отсутствуют файлы'
}

async function loadConnectionFilesStatus(connectionId) {
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
            
            connectionFilesStatus.value.set(connectionId, {
                hasMissingFiles,
                hasProblematicFiles,
                filesCount: files.length
            })
        }
    } catch (error) {
        console.warn(`Не удалось загрузить статус файлов для подключения ${connectionId}:`, error)
    }
}

async function loadAllConnectionFilesStatus() {
    if (!users.value || users.value.length === 0) return
    
    const fileConnections = users.value.filter(row => {
        const type = (row.connector_type_display || row.connector_type || '').toLowerCase().trim()
        return type === 'file' || 
               type === 'files' || 
               type === 'файл' || 
               type === 'файлы' ||
               type.includes('file') || 
               type.includes('файл')
    })
    
    const promises = fileConnections.map(connection => 
        loadConnectionFilesStatus(connection.id)
    )
    
    await Promise.allSettled(promises)
}
</script>

<style scoped lang="scss">
.connection-list {
    list-style: none;
    max-height: 355px;
    overflow-y: auto;
    padding: 0;
    margin: 0;
}

.connection-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 6px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
        background-color: var(--color-hover-background);
    }
    
    &.problematic {
        opacity: 0.6;
        cursor: not-allowed;
        
        &:hover {
            background-color: transparent;
        }
    }
}

.connection-item.selected {
  background-color: var(--color-hover-background);
  border: 1.5px solid #198754;
}

.connection-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.connection-name {
    color: var(--color-primary-text);
    font-size: 14px;
}

.connection-date {
    font-size: 13px;
    color: var(--color-secondary-text);
}

.icon {
    width: 18px;
    height: 18px;
}

.alert-icon {
    color: var(--color-accent);
    cursor: pointer;
    transition: color 0.2s ease;
}

.alert-icon:hover {
    color: #ff5252;
}

.no-data {
    padding: 12px;
    text-align: center;
    color: var(--color-primary-text);
}

.loading-placeholder {
    opacity: 0.6;
    animation: pulse 1.5s infinite ease-in-out;
}

.skeleton-icon {
    width: 18px;
    height: 18px;
    background-color: var(--color-secondary-text);
    border-radius: 4px;
}

.skeleton-text {
    width: 100px;
    height: 14px;
    background-color: var(--color-secondary-text);
    border-radius: 4px;
    margin-left: 8px;
}

.skeleton-date {
    width: 60px;
    height: 12px;
    background-color: var(--color-secondary-text);
    border-radius: 4px;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 0.6;
    }

    50% {
        opacity: 1;
    }
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
  
  &.error-tooltip {
    border: 1px solid var(--color-accent);
  }
}
</style>