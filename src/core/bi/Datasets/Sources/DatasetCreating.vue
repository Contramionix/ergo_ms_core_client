<template>
    <div class="dataset-creating-main">
        <div ref="tooltipTriggersRef" class="dataset-creating-triggers">
            <div class="dataset-connections">
                <div class="main-connections">
                    <div>Подключение:</div>
                    <button v-if="!selectedConnection" type="button" class="btn btn-primary button-card-connection" @click="openTooltip"><Cable :size="24" />Выбрать подключение</button>
                    <div v-else class="selected-connection" :class="{ 'problematic-connection': isConnectionProblematic }" @click="openTooltip">
                        <img v-if="getIconComponent(selectedConnection)" :src="getIconComponent(selectedConnection).src" class="icon" />
                        <span>{{ selectedConnection.name }}</span>
                        <TriangleAlert v-if="isConnectionProblematic" class="alert-icon" :size="16" @mouseenter="onIconHover($event, getConnectionProblemTooltip())" @mouseleave="hideTooltip"/>
                    </div>
                </div>
            </div>

            <transition name="fade-slide" appear>
                <div class="connection-tables" v-if="selectedConnection && !isConnectionProblematic">
                    <div class="main-connections">
                        <div>Главная таблица:</div>
                        <button v-if="!mainTable" type="button" class="btn btn-primary button-card-connection" @click="openTableTooltip">
                            <Grid2x2Plus :size="24" />Выбрать главную таблицу
                        </button>
                        <div v-else class="selected-connection" @click="openTableTooltip">
                            <Table :size="24" class="icon" /><span>{{ mainTable.name || (mainTable.schema + '.' + mainTable.table) }}</span>
                        </div>
                    </div>
                </div>
            </transition>

            <transition name="fade-slide" appear>
                <div class="table-links" v-if="mainTable && !isConnectionProblematic && availableTablesForRelation.length > 0">
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
                            <button type="button" v-if="availableTablesForRelation.length" class="btn btn-primary button-card-connection" @click="emit('openTableLinkModal')">
                                <Plus :size="24" />Добавить связь
                            </button>
                            <span v-if="!availableTablesForRelation.length"><i>Нет доступных таблиц для связи</i></span>
                        </div>
                    </div>
                </div>
            </transition>
        </div>
        <div v-if="showTooltip || showTableTooltip" class="tooltip-panel" :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }" ref="tooltipRef">
            <ConnectionsTooltip v-if="showTooltip" :selected-connection="props.selectedConnection" @select="handleSelect" />
            <TableTooltip v-if="showTableTooltip" :connection-id="selectedConnection.id" :connection-type="selectedConnection.connector_type" :selected-table="mainTable" @select="handleTableSelect" @tablesLoaded="handleTablesLoaded" @resetSelection="handleResetSelection"/>
        </div>
        <div v-if="showProblemTooltip" class="tooltip-fixed error-tooltip" :style="problemTooltipStyle">{{ problemTooltipText }}</div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
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
const problemTooltipStyle = ref({})
const problemTooltipText = ref('')

const TOOLTIP_PANEL_WIDTH = 416
const TOOLTIP_PANEL_HEIGHT = 436
const TOOLTIP_VIEWPORT_PADDING = 8

function clampTooltipToViewport(x, y) {
  const viewWidth = window.innerWidth
  const viewHeight = window.innerHeight
  const left = Math.max(TOOLTIP_VIEWPORT_PADDING, Math.min(x, viewWidth - TOOLTIP_PANEL_WIDTH - TOOLTIP_VIEWPORT_PADDING))
  const top = Math.max(TOOLTIP_VIEWPORT_PADDING, Math.min(y, viewHeight - TOOLTIP_PANEL_HEIGHT - TOOLTIP_VIEWPORT_PADDING))
  return { x: left, y: top }
}

const tooltipRef = ref(null)
const tooltipTriggersRef = ref(null)

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

const connectionType = computed(() =>
  (props.selectedConnection?.connector_type_display || props.selectedConnection?.connector_type || '').toLowerCase().trim()
)

const isFileConnection = computed(() =>
  connectionType.value.includes('file') || connectionType.value.includes('файл')
)

const isConnectionProblematic = computed(() => {
  if (!props.selectedConnection) return false
  if (isFileConnection.value) {
    return props.selectedConnection.hasMissingFiles || props.selectedConnection.hasProblematicFiles
  }
  return false
})

function tableBelongsToConnection(table, connection) {
  const type = (connection?.connector_type_display || connection?.connector_type || '').toLowerCase()
  const isFile = type.includes('file') || type.includes('файл')
  if (isFile) {
    return table.file_id === connection.id || table.connection_id === connection.id || table.id === connection.id
  }
  return !table.connection_id || table.connection_id === connection.id
}

const usedTableIds = computed(() => {
  const set = new Set(props.relations.map(r => Number(r.rightTableId)))
  if (props.mainTable) set.add(Number(props.mainTable.id))
  return set
})

const mainFileId = props.mainTable?.file_id ?? null

const availableTablesForRelation = computed(() => {
  if (!props.mainTable || !props.selectedConnection) return []

  return props.allTables.filter(t => {
    if (!tableBelongsToConnection(t, props.selectedConnection)) return false

    const idNum = Number(t.id)
    if (idNum === props.mainTable.id) return false
    if (mainFileId !== null && idNum === -mainFileId) return false
    if (mainFileId !== null && t.file_id === mainFileId) return false
    if (idNum < 0 && usedTableIds.value.has(Math.abs(idNum))) return false
    if (t.file_upload_id == null && t.file_id == null) return false
    return !usedTableIds.value.has(idNum)
  })
})

function openPanel(event, type) {
  const isConn = type === 'connection'
  const showRef = isConn ? showTooltip : showTableTooltip
  const otherRef = isConn ? showTableTooltip : showTooltip
  if (showRef.value) {
    showRef.value = false
    return
  }
  otherRef.value = false
  const rect = event.currentTarget.getBoundingClientRect()
  tooltipPosition.value = clampTooltipToViewport(rect.left, rect.bottom + 8)
  showRef.value = true
}

function openTooltip(event) {
  openPanel(event, 'connection')
}

function openTableTooltip(event) {
  openPanel(event, 'table')
}

function closeTooltip() {
    showTooltip.value = false
    showTableTooltip.value = false
}

function handleSelect(connection) {
    if (props.selectedConnection && connection.id !== props.selectedConnection.id) {
        if (props.mainTable) emit('update:mainTable', null)
        if (props.relations?.length) emit('resetAllRelations')
    }
    emit('update:selectedConnection', connection)
    showTooltip.value = false
}

async function handleTableSelect(table) {
  let tableToEmit = table

  if (props.selectedConnection && table) {
    if (!tableBelongsToConnection(table, props.selectedConnection)) {
      console.warn('[DatasetCreating] Попытка выбрать таблицу из другого подключения')
      return
    }

    const tableInAllTables = props.allTables.find(t =>
      isFileConnection.value
        ? Math.abs(t.id) === table.id || t.file_id === table.id
        : t.id === table.id
    )

    if (tableInAllTables) {
      tableToEmit = tableInAllTables
    } else if (isFileConnection.value) {
      tableToEmit = {
        ...table,
        file_id: table.file_id || table.id,
        connection_id: table.connection_id || props.selectedConnection.id,
        name: table.name || table.original_filename || table.display_name,
        display_name: table.display_name || table.original_filename || table.name,
        table_ref: null
      }
    }
  }

  emit('update:mainTable', tableToEmit)
  showTableTooltip.value = false
}

function handleResetSelection() {
  emit('update:mainTable', null)
}

function handleTablesLoaded(tables) {
  emit('tablesLoaded', tables)
}

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

  let tooltipText = ''
  if (isFileConnection.value) {
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
  const arr = Array.isArray(props.allTables) ? props.allTables : []
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
  switch (joinType) {
    case 'left': return JoinLeftIcon
    case 'right': return JoinRightIcon
    case 'full': return JoinFullIcon
    default: return JoinInnerIcon
  }
}

function onClickOutside(event) {
  const tooltipEl = tooltipRef.value
  const triggersEl = tooltipTriggersRef.value
  if (
    tooltipEl && !tooltipEl.contains(event.target) &&
    triggersEl && !triggersEl.contains(event.target)
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
.dataset-creating-triggers {
    display: contents;
}

.dataset-creating-main {
    display: flex;
    width: 100%;
    max-width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    min-height: 400px;
    box-sizing: border-box;
    overflow-x: hidden;
}

.main-connections {
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    gap: 10px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
}

.dataset-connections,
.connection-tables,
.table-links {
    width: 100%;
    max-width: 100%;
    min-height: 80px;
    box-sizing: border-box;
}

.tooltip-panel {
    position: fixed;
    width: 416px;
    height: 436px;
    max-width: min(416px, calc(100vw - 24px));
    max-height: min(436px, calc(100vh - 24px));
    overflow: auto;
    background-color: var(--color-primary-background);
    border-radius: 8px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.6);
    z-index: 1100;
    padding: 1rem;
    color: var(--color-primary-text);
}

.icon {
    width: 22px;
    height: 22px;
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
    max-width: 100%;
    padding: 0 18px;
    cursor: pointer;
    transition: border 0.15s;
    position: relative;
    box-sizing: border-box;

    &:hover {
        background: var(--color-hover-background);
    }

    .connection-name {
        font-weight: 600;
        font-size: 16px;
        color: var(--color-primary-text);
    }

    &.problematic-connection {
        border-color: var(--color-accent);
    }
}

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