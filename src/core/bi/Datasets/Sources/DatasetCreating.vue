<template>
    <div class="dataset-creating-main">
        <div class="dataset-connections">
            <div class="main-connections">
                <div>Подключение:</div>
                <button v-if="!selectedConnection" type="button" class="btn btn-primary button-card-connection" @click="openTooltip" ref="buttonRef">
                    <Cable :size="24" />Выбрать подключение
                </button>
                <div v-else class="selected-connection" :class="{ 'problematic-connection': isConnectionProblematic }" @click="openTooltip" ref="buttonRef">
                    <img v-if="getIconComponent(selectedConnection)" :src="getIconComponent(selectedConnection).src" class="icon" />
                    <span>{{ selectedConnection.name }}</span>
                    <!-- Иконка предупреждения для проблемных подключений -->
                    <TriangleAlert 
                        v-if="isConnectionProblematic" 
                        class="alert-icon" 
                        :size="16" 
                        @mouseenter="onIconHover($event, getConnectionProblemTooltip())"
                        @mouseleave="hideTooltip"
                    />
                </div>
            </div>
        </div>

        <transition name="fade-slide" appear>
            <div class="connection-tables" v-if="selectedConnection && !isConnectionProblematic">
                <div class="main-connections">
                    <div>Главная таблица:</div>
                    <button v-if="!mainTable" type="button" class="btn btn-primary button-card-connection" @click="openTableTooltip" ref="buttonRef">
                        <Grid2x2Plus :size="24" />Выбрать главную таблицу
                    </button>
                    <div v-else class="selected-connection" @click="openTableTooltip">
                        <Table :size="24" class="icon" />
                        <span>{{ mainTable.name || (mainTable.schema + '.' + mainTable.table) }}</span>
                    </div>
                </div>
            </div>
        </transition>

        <transition name="fade-slide" appear>
            <div class="table-links" v-if="mainTable && relations && !isConnectionProblematic">
                <div class="main-connections">
                    <div>Связи:</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div class="relation-list" v-if="relations && relations.length">
                            <div v-for="rel in relations" :key="rel.rightTableId" class="selected-connection relation-item" @click="onEditRelation(rel)">
                                <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
                                    <component :is="getJoinIcon(rel.joinType)" class="join-icon icon" style="width: 28px; height: 28px;" />
                                    <span class="linked-table-name">{{ rel.rightTableName || getTableNameById(rel.rightTableId) }}</span>
                                </div>
                                <button type="button" class="btn btn-link btn-sm relation-remove-btn" @click.stop="emit('removeRelation', rel.rightTableId)" title="Удалить связь"><X :size="22"/></button>
                            </div>
                        </div>
                        <button type="button" v-if="availableTablesForRelation.length" class="btn btn-primary button-card-connection" ref="buttonRef" @click="emit('openTableLinkModal')">
                            <Plus :size="24" />Добавить связь
                        </button>
                        <span v-if="availableTablesForRelation.length"><i>Нет доступных таблиц для связи</i></span>
                    </div>
                </div>
            </div>
        </transition>

        <div v-if="showTooltip || showTableTooltip" class="tooltip-panel" :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }" ref="tooltipRef">
            <ConnectionsTooltip v-if="showTooltip" :selected-connection="props.selectedConnection" @select="handleSelect" />
            <TableTooltip v-if="showTableTooltip" :connection-id="selectedConnection.id" :connection-type="selectedConnection.connector_type" :selected-table="mainTable" @select="handleTableSelect" @tablesLoaded="handleTablesLoaded" @resetSelection="handleResetSelection"/>
        </div>

        <!-- Тултип для проблемных подключений -->
        <div v-if="showProblemTooltip" class="tooltip-fixed error-tooltip" :style="problemTooltipStyle">{{ problemTooltipText }}</div>

    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { Cable, Grid2x2Plus, Plus, Table, X, TriangleAlert } from 'lucide-vue-next'
import ClickHouseIcon from '@/core/bi/assets/icons/clickhouse.svg'
import PostgresIcon from '@/core/bi/assets/icons/postgres.svg'
import MssqlIcon from '@/core/bi/assets/icons/mssql.svg'
import FileIcon from '@/core/bi/assets/icons/folder_windows_style.svg'
import ConnectionsTooltip from '@/core/bi/Datasets/Sources/ConnectionsTooltip.vue'
import TableTooltip from '@/core/bi/Datasets/components/TablesTooltip.vue'

import JoinInnerIcon from '@/core/bi/Datasets/components/icons/JoinInnerIcon.vue'
import JoinLeftIcon from '@/core/bi/Datasets/components/icons/JoinLeftIcon.vue'
import JoinRightIcon from '@/core/bi/Datasets/components/icons/JoinRightIcon.vue'
import JoinFullIcon from '@/core/bi/Datasets/components/icons/JoinFullIcon.vue'

const showTooltip = ref(false)
const showTableTooltip = ref(false)
const showProblemTooltip = ref(false)

const tooltipPosition = ref({ x: 0, y: 0 })
const tableTooltipPosition = ref({ x: 0, y: 0 })
const problemTooltipStyle = ref({})
const problemTooltipText = ref('')

const tooltipRef = ref(null)
const buttonRef = ref(null)

const props = defineProps({
  selectedConnection: Object,
  mainTable: Object,
  allTables: {
    type: Array,
    default: () => []
  },
  relations: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:selectedConnection', 'update:mainTable', 'openTableLinkModal', 'tablesLoaded', 'editRelation', 'removeRelation', 'resetAllRelations'])

// Примечание: основная логика сброса данных при смене подключения теперь находится в handleSelect

// Проверка проблем с подключением
const isConnectionProblematic = computed(() => {
  if (!props.selectedConnection) return false
  
  const type = (props.selectedConnection.connector_type_display || props.selectedConnection.connector_type || '').toLowerCase().trim()
  
  // Для файловых подключений проверяем статус файлов
  if (type.includes('file') || type.includes('файл')) {
    return props.selectedConnection.hasMissingFiles || props.selectedConnection.hasProblematicFiles
  }
  
  // Для других типов подключений можно добавить дополнительные проверки
  return false
})

const usedTableIds = computed(() => {
  const set = new Set(props.relations.map(r => Number(r.rightTableId)))
  if (props.mainTable) set.add(Number(props.mainTable.id))
  return set
})

const mainFileId = props.mainTable?.file_id ?? null

const availableTablesForRelation = computed(() => {
  if (!props.mainTable || !props.selectedConnection) return []

  return props.allTables.filter(t => {
    // Проверяем, что таблица принадлежит текущему подключению
    let belongsToCurrentConnection = false
    
    if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
        props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
      belongsToCurrentConnection = t.file_id === props.selectedConnection.id
    } else {
      belongsToCurrentConnection = !t.connection_id || t.connection_id === props.selectedConnection.id
    }
    
    if (!belongsToCurrentConnection) return false
    
    const idNum = Number(t.id)
    if (idNum === props.mainTable.id) return false
    if (mainFileId !== null && idNum === -mainFileId) return false
    if (mainFileId !== null && t.file_id === mainFileId) return false
    if (idNum < 0 && usedTableIds.value.has(Math.abs(idNum))) return false
    if (t.file_upload_id == null && t.file_id == null) return false
    return !usedTableIds.value.has(idNum)
  })
})

function openTooltip(event) {
    tooltipPosition.value = { x: event.clientX, y: event.clientY + 8 }
    showTooltip.value = true
}

function openTableTooltip(event) {
    // Просто открываем тултип для выбора таблицы, без дополнительных проверок
    // Проверки принадлежности таблицы к подключению уже выполнены в других местах
    showTableTooltip.value = true
    tableTooltipPosition.value = { x: event.clientX, y: event.clientY }
}

function closeTooltip() {
    showTooltip.value = false
    showTableTooltip.value = false
}

function handleSelect(connection) {
    // Если подключение изменилось, сбрасываем все связанные данные
    if (props.selectedConnection && connection.id !== props.selectedConnection.id) {
        // Сбрасываем главную таблицу всегда при смене подключения (в режиме черновика)
        if (props.mainTable) {
            emit('update:mainTable', null)
        }
        
        // Сбрасываем все связи при смене подключения
        if (props.relations && props.relations.length > 0) {
            // Эмитим специальное событие для массового сброса связей
            emit('resetAllRelations')
        }
    }
    
    emit('update:selectedConnection', connection)
    showTooltip.value = false
}

async function handleTableSelect(table) {
  // Проверяем, что выбранная таблица принадлежит текущему подключению
  if (props.selectedConnection && table) {
    let belongsToCurrentConnection = false
    
    // Для файловых подключений проверяем file_id
    if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
        props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
      belongsToCurrentConnection = table.file_id === props.selectedConnection.id
    } else {
      // Для других типов подключений проверяем connection_id
      belongsToCurrentConnection = !table.connection_id || table.connection_id === props.selectedConnection.id
    }
    
    if (!belongsToCurrentConnection) {
      console.warn('[DatasetCreating] Попытка выбрать таблицу из другого подключения')
      return
    }
    
    // Дополнительная проверка: убеждаемся, что таблица действительно существует в текущем подключении
    // Используем более гибкую проверку, так как allTables может еще не обновиться
    const tableExists = props.allTables.some(t => {
      if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
          props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
        return t.file_id === props.selectedConnection.id && t.id === table.id
      } else {
        return (!t.connection_id || t.connection_id === props.selectedConnection.id) && t.id === table.id
      }
    })
    
    // Если таблица не найдена в allTables, но она принадлежит текущему подключению,
    // все равно позволяем её выбрать (возможно, allTables еще не обновился)
    if (!tableExists) {
      // Дополнительная проверка: убеждаемся, что таблица действительно загружена
      // и принадлежит текущему подключению
      if (table.connection_id && table.connection_id !== props.selectedConnection.id) {
        console.warn('[DatasetCreating] Таблица имеет connection_id, который не совпадает с текущим подключением')
        return
      }
      
      if (table.file_id && table.file_id !== props.selectedConnection.id) {
        console.warn('[DatasetCreating] Таблица имеет file_id, который не совпадает с текущим подключением')
        return
      }
    }
  }
  
  emit('update:mainTable', table)
  showTableTooltip.value = false
}

function handleResetSelection() {
  emit('update:mainTable', null)
}

function handleTablesLoaded(tables) {
  emit('tablesLoaded', tables)
}

// Функции для тултипа проблемных подключений
function onIconHover(event, text) {
  problemTooltipText.value = text
  showProblemTooltip.value = true
  const rect = event.target.getBoundingClientRect()
  problemTooltipStyle.value = {
    position: 'fixed',
    top: `${rect.top + window.scrollY - 32}px`,
    left: `${rect.left + rect.width / 2 + window.scrollX}px`
  }
}

function hideTooltip() {
  showProblemTooltip.value = false
}

function getConnectionProblemTooltip() {
  if (!props.selectedConnection) return ''
  
  const type = (props.selectedConnection.connector_type_display || props.selectedConnection.connector_type || '').toLowerCase().trim()
  
  let tooltipText = ''
  
  if (type.includes('file') || type.includes('файл')) {
    if (props.selectedConnection.hasProblematicFiles) {
      tooltipText = 'Возникла проблема с одним из файлов в подключении'
    } else if (props.selectedConnection.hasMissingFiles) {
      tooltipText = 'В подключении отсутствуют файлы'
    }
  }
  
  if (!tooltipText) {
    tooltipText = 'Проблема с подключением'
  }
  
  return tooltipText
}

function getTableNameById(tableId) {
  const arr = Array.isArray(props.allTables) ? props.allTables : (props.allTables?.value ?? []);
  const found = arr.find(t => String(t.id) === String(tableId));
  
  const tableName = found?.display_name ||
    found?.table_name ||
    found?.original_filename ||
    found?.name ||
    found?.alias ||
    found?.sheet_name ||
    found?.id ||
    'Неизвестно'
  
  return tableName
}

function getIconComponent(connection) {
    if (!connection) return null
    
    const type = (connection.connector_type_display || connection.connector_type || '').toLowerCase().trim()
    let icon = null
    
    if (type.includes('clickhouse')) {
        icon = { src: ClickHouseIcon }
    } else if (type.includes('postgres')) {
        icon = { src: PostgresIcon }
    } else if (type.includes('sql server') || type.includes('mssql')) {
        icon = { src: MssqlIcon }
    } else if (type.includes('file') || type.includes('файл')) {
        icon = { src: FileIcon }
    }
    
    return icon
}

function getJoinIcon(type) {
  const joinType = (type || '').toLowerCase()
  let icon = JoinInnerIcon
  
  switch (joinType) {
    case 'left':  icon = JoinLeftIcon; break
    case 'right': icon = JoinRightIcon; break
    case 'full':  icon = JoinFullIcon; break
    case 'inner': icon = JoinInnerIcon; break
    default:      icon = JoinInnerIcon; break
  }
  
  return icon
}

function onClickOutside(event) {
    const tooltipEl = tooltipRef.value
    const buttonEl = buttonRef.value
    if (
        tooltipEl && !tooltipEl.contains(event.target) &&
        buttonEl && !buttonEl.contains(event.target)
    ) {
        closeTooltip()
    }
}

function onEditRelation(rel, idx) {
  emit('editRelation', rel, idx)
}

onMounted(() => {
    document.addEventListener('mousedown', onClickOutside)
})
onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onClickOutside)
})
</script>

<style scoped lang="scss">
.dataset-creating-main {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    min-height: 400px;
}

.main-connections {
    min-height: 60px;
    display: flex;
    align-items: center;
    flex-direction: row;
    gap: 10px;
    width: 100%;
}

.dataset-connections,
.connection-tables,
.table-links {
    width: 100%;
    min-height: 80px;
}

.tooltip-panel {
    position: fixed;
    top: 300px;
    left: 385px;
    width: 416px;
    height: 436px;
    background-color: var(--color-primary-background);
    border-radius: 8px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.6);
    z-index: 100;
    padding: 1rem;
    color: var(--color-primary-text);
}

.connections-list {
    padding: 0 10px;
}

.connection-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border-radius: 6px;
    margin-top: 8px;
    transition: background 0.2s;

    &:hover {
        background-color: var(--color-hover-background);
    }
}

.connection-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.icon {
    width: 22px;
    height: 22px;
    color: var(--color-accent);
}

.connection-actions {
    width: 32px;
    height: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    transition: opacity 0.2s ease;
}

.connection-actions .action-btn {
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
}

.connection-item:hover .connection-actions .action-btn {
    opacity: 1;
    visibility: visible;
}

.action-btn {
    background: transparent;
    border: none;
    color: var(--color-secondary-text);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;

    &:hover {
        backdrop-filter: brightness(150%);
    }
}

.menu-dropdown {
    position: fixed;
    background-color: var(--color-primary-background);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    padding: 8px 0;
    min-width: 160px;
    z-index: 10000;
    pointer-events: auto;
}

.menu-item {
    padding: 8px 16px;
    color: var(--color-primary-text);
    cursor: pointer;
    transition: background 0.2s;
}

.menu-item:hover {
    background-color: var(--color-hover-background);
}

.menu-item.danger {
    color: var(--color-accent);
}

.button-card-connection {
    display: flex;
    align-items: center;
    gap: 10px;
}

.selected-connection {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--color-primary-background);
    border: 1.5px solid #198754;
    border-radius: 10px;
    min-height: 46px;
    width: 280px;
    padding: 0 18px;
    cursor: pointer;
    transition: border 0.15s;
    position: relative;

    &:hover {
        background: var(--color-hover-background);
    }

    .connection-name {
        font-weight: 600;
        font-size: 16px;
        color: var(--color-primary-text);
    }
    
    // Стили для проблемных подключений
    &.problematic-connection {
        border-color: var(--color-accent);
    }
}

// Стили для иконки предупреждения
.alert-icon {
    color: var(--color-accent);
    margin-left: auto;
    cursor: help;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: opacity 0.32s cubic-bezier(.5, 1.8, .5, 1), transform 0.62s cubic-bezier(.5, 1.8, .5, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(32px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
    opacity: 1;
    transform: translateY(0);
}

.join-icon {
  vertical-align: middle;
}
.relation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.relation-list{
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 400px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 5px;
}

.relation-remove-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-secondary-text);
  transition: color .18s;
  &:hover {
    color: var(--color-accent);
  }
}

// Стили для тултипа проблем
.tooltip-fixed {
    position: fixed;
    background-color: var(--color-primary-background);
    color: var(--color-primary-text);
    padding: 8px 12px;
    border-radius: 6px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    white-space: nowrap;
    pointer-events: none;
    
    &.error-tooltip {
        background-color: #dc3545;
        color: white;
    }
}
</style>
