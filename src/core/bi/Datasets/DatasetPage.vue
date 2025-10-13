<template>
  <div class="layout" :style="{
    gridTemplateColumns: activeTab === 'sources' ? '250px 1fr' : '1fr'
  }">
    <!-- Заголовок страницы -->
    <DatasetHeader 
      :header-name="headerName"
      :is-new-page="isNewPage"
      :can-create-dataset="canCreateDataset"
      :saving="saving"
      :save-success="saveSuccess"
      :is-dirty="isDirty"
      @show-dataset-dialog="showDatasetDialog = true"
      @edit-dataset="editDataset"
    />

    <!-- Панель инструментов -->
    <DatasetToolbar 
      v-model:active-tab="activeTab"
      :is-preview-loading="isPreviewLoading"
      :connection-status="getConnectionStatus()"
      @refresh-fields="refreshFields"
      @toggle-preview="togglePreview"
      @add-field="addField"
    />

    <!-- Основное содержимое -->
    <DatasetMainContent 
      :active-tab="activeTab"
      :selected-connection="selectedConnection"
      :main-table="mainTable"
      :relations="relations"
      :all-tables-of-connection="allTablesOfConnection"
      :selected-tables="selectedTables"
      :fields="fields"
      :preview-cols="previewCols"
      :preview-rows="previewRows"
      :dataset="dataset"
      :is-preview-visible="isPreviewVisible"
      :connection-status="getConnectionStatus()"
      @edit-relation="onEditRelation"
      @remove-relation="removeRelationById"
      @open-table-link-modal="openTableLinkModal"
      @tables-loaded="handleTablesLoaded"
      @remove-table="handleRemoveTable"
      @edit-field="onEditField"
      @update:fields="fields = $event"
      @update:selected-connection="selectedConnection = $event"
      @update:main-table="mainTable = $event"
      @update:active-tab="activeTab = $event"
      @resetAllRelations="handleResetAllRelations"
      @params-changed="paramsDirtyTick++"
    />

    <!-- Футер с предпросмотром -->
    <DatasetFooter 
      :is-preview-visible="isPreviewVisible"
      :preview-rows="previewRows"
      :preview-cols="previewCols"
      :fields="fields"
      :dataset-id="currentDatasetId"
      :is-preview-loading="isPreviewLoading"
      :connection-status="getConnectionStatus()"
      @update:preview-limit="previewLimit = $event"
      @switch-to-sources="activeTab = 'sources'"
    />

    <!-- Модальные окна -->
    <DatasetModals 
      :show-modal="showModal"
      :selected-field="selectedField"
      :selected-tables="selectedTables"
      :preview-cols="previewCols"
      :preview-rows="previewRows"
      :show-table-link-modal="showTableLinkModal"
      :all-tables-of-connection="allTablesOfConnection"
      :editing-relation="editingRelation"
      :main-table="mainTable"
      :current-dataset-id="currentDatasetId"
      :show-dataset-dialog="showDatasetDialog"
      :dataset-name="dataset?.name"
      :used-right-table-ids="usedRightTableIds"
      :selected-connection="selectedConnection"
      @close-modal="showModal = false"
      @source-save="onSourceSave"
      @close-table-link-modal="showTableLinkModal = false"
      @relation-apply="handleRelationApply"
      @dataset-saved="saveDataset"
      @update:show-dataset-dialog="showDatasetDialog = $event"
    />

  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useDatasetState } from '@/core/bi/Datasets/components/js/useDatasetState'
import { useDatasetActions } from '@/core/bi/Datasets/components/js/useDatasetActions'

// Импортируем компоненты
import DatasetHeader from '@/core/bi/Datasets/DatasetHeader.vue'
import DatasetToolbar from '@/core/bi/Datasets/DatasetToolbar.vue'
import DatasetMainContent from '@/core/bi/Datasets/Sources/DatasetMainContent.vue'
import DatasetFooter from '@/core/bi/Datasets/DatasetFooter.vue'
import DatasetModals from '@/core/bi/Datasets/Sources/DatasetModals.vue'

// Используем композаблы
const state = useDatasetState()
const actions = useDatasetActions(state)

// Деструктурируем состояние
const {
  dataset,
  origDatasetRef,
  mainTable,
  allTablesOfConnection,
  relations,
  activeTab,
  isPreviewVisible,
  isPreviewLoading,
  saving,
  saveSuccess,
  fields,
  selectedTables,
  previewCols,
  previewRows,
  previewLimit,
  showModal,
  showTableLinkModal,
  showDatasetDialog,
  selectedField,
  editingRelation,
  editingRelationIndex,
  selectedConnection,
  fileUploadsCache,
  datasetId,
  isNewPage,
  currentDatasetId,
  headerName,
  canCreateDataset,
  isDirty,
  paramsDirtyTick,
  usedRightTableIds,
  computedLinkedTableIds
} = state

// Деструктурируем действия
const {
  saveDataset,
  editDataset,
  safeUpdateDataset,
  loadDataset,
  hydrateFromDataset,
  fetchConnectionFiles,
  updateConnectionStatus,
  analyzeFileStatus,
  buildAllTables,
  mapTable,
  updateSelectedTables,
  sanitizeRelations,
  loadPreview,
  loadFields,
  detectColumnType,
  refreshFields,
  handleRelationApply,
  removeRelationById,
  togglePreview,
  addField,
  handleRemoveTable,
  onSourceSave
} = actions

// Функции для обработки событий

function onEditField(field) {
  selectedField.value = field
  showModal.value = true
}

// Вспомогательная функция для проверки принадлежности таблицы к подключению
function tableBelongsToConnection(table, connection) {
  if (!table || !connection) return false
  
  if (connection.connector_type_display?.toLowerCase().includes('file') || 
      connection.connector_type?.toLowerCase().includes('файл')) {
    return table.file_id === connection.id
  } else {
    return !table.connection_id || table.connection_id === connection.id
  }
}

function handleTablesLoaded(files) {
  fileUploadsCache.value = files
  buildAllTables(files)
  
  if (selectedConnection.value && files) {
    updateConnectionStatus(files)
  }

  // Проверяем принадлежность главной таблицы к текущему подключению
  // Только если главная таблица была выбрана ранее и не принадлежит текущему подключению
  if (mainTable.value && selectedConnection.value) {
    if (!tableBelongsToConnection(mainTable.value, selectedConnection.value)) {
      console.log('[DatasetPage] Главная таблица не принадлежит текущему подключению, сбрасываем')
      // Сбрасываем все связанные данные при несоответствии подключения
      mainTable.value = null
      relations.value = []
      selectedTables.value = []
      fields.value = []
      previewCols.value = []
      previewRows.value = []
      return
    }
  }

  if (
    mainTable.value &&
    /^temp_[a-f0-9]{32}/.test(mainTable.value.display_name || '')
  ) {
    const match = files.find(
      f => mainTable.value.file_id
        ? f.id === mainTable.value.file_id
        : f.columns_info &&
        mainTable.value.columns_info &&
        JSON.stringify(f.columns_info.columns) ===
        JSON.stringify(mainTable.value.columns_info.columns)
    )

    if (match) {
      mainTable.value.display_name = match.original_filename
      mainTable.value.name = match.original_filename
      if (!mainTable.value.columns_info && match.columns_info) {
        mainTable.value.columns_info = match.columns_info
      }
    }
  }
  
  updateSelectedTables()
}

// Функция для определения статуса подключения
function getConnectionStatus() {
  if (!selectedConnection.value) return 'disconnected'
  
  if (selectedConnection.value.hasMissingFiles || selectedConnection.value.hasProblematicFiles) {
    return 'error'
  }
  
  return 'connected'
}

async function onEditRelation(rel, idx) {
  editingRelation.value = JSON.parse(JSON.stringify(rel))
  editingRelationIndex.value = idx
  
  if (selectedConnection.value?.id) {
    await fetchConnectionFiles(selectedConnection.value.id)
    buildAllTables(fileUploadsCache.value)
    
    if (fileUploadsCache.value) {
      updateConnectionStatus(fileUploadsCache.value)
    }
    
    const rightTable = allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
    if (!rightTable) {
      relations.value.splice(idx, 1)
      editingRelation.value = null
      editingRelationIndex.value = null
      return
    }
    
    if (!tableBelongsToConnection(rightTable, selectedConnection.value)) {
      // Удаляем связь, которая не принадлежит текущему подключению
      relations.value.splice(idx, 1)
      editingRelation.value = null
      editingRelationIndex.value = null
      
      // Также проверяем и очищаем главную таблицу, если она не принадлежит текущему подключению
      if (mainTable.value && !tableBelongsToConnection(mainTable.value, selectedConnection.value)) {
        mainTable.value = null
        selectedTables.value = []
        fields.value = []
        previewCols.value = []
        previewRows.value = []
      }
      return
    }
  }
  
  showTableLinkModal.value = true
}

function handleResetAllRelations() {
  console.log('[DatasetPage] handleResetAllRelations вызван, сбрасываем все связи')
  
  // Сбрасываем все связи в режиме черновика
  relations.value = []
  
  // Также сбрасываем связанные данные для предпросмотра
  fields.value = []
  previewCols.value = []
  previewRows.value = []
  
  // Обновляем выбранные таблицы
  updateSelectedTables()
}

async function openTableLinkModal() {
  if (!selectedConnection.value?.id) return

  await fetchConnectionFiles(selectedConnection.value.id)
  buildAllTables(fileUploadsCache.value)
  
  if (fileUploadsCache.value) {
    updateConnectionStatus(fileUploadsCache.value)
  }
  
  // Проверяем и фильтруем связи по принадлежности к текущему подключению
  if (relations.value.length > 0) {
    const validRelations = relations.value.filter(rel => {
      const rightTable = allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
      if (!rightTable) return false
      
      return tableBelongsToConnection(rightTable, selectedConnection.value)
    })
    
    if (validRelations.length < relations.value.length) {
      relations.value = validRelations
    }
  }
  
  // Также проверяем главную таблицу
  if (mainTable.value && !tableBelongsToConnection(mainTable.value, selectedConnection.value)) {
    console.log('[DatasetPage] openTableLinkModal: Главная таблица не принадлежит текущему подключению, сбрасываем')
    // Сбрасываем главную таблицу и связанные данные
    mainTable.value = null
    selectedTables.value = []
    fields.value = []
    previewCols.value = []
    previewRows.value = []
  }

  editingRelation.value = null
  editingRelationIndex.value = null
  showTableLinkModal.value = true
}

watch(mainTable, async (val, oldVal) => {
  if (!val) return

  if (val.file_type && !val.file_id) val.file_id = val.id

  // Проверяем принадлежность главной таблицы к текущему подключению
  // Только если это новая таблица (не была выбрана ранее)
  if (val && selectedConnection.value && !oldVal) {
    if (!tableBelongsToConnection(val, selectedConnection.value)) {
      console.log('[DatasetPage] watch mainTable: Новая таблица не принадлежит текущему подключению, сбрасываем')
      // Если таблица не принадлежит текущему подключению, сбрасываем её
      mainTable.value = null
      relations.value = []
      selectedTables.value = []
      fields.value = []
      previewCols.value = []
      previewRows.value = []
      return
    }
  }

  if ((val.file_id || val.table_name) && selectedConnection.value) {
    await loadPreview()
    
    if (fileUploadsCache.value) {
      updateConnectionStatus(fileUploadsCache.value)
    }
  }
  updateSelectedTables()
})

watch(selectedConnection, async (newConnection, oldConnection) => {
  if (newConnection && oldConnection && newConnection.id !== oldConnection.id) {
    console.log('[DatasetPage] Watcher: Подключение изменилось, выполняем полный сброс данных')
    
    // Сбрасываем все данные при смене подключения в режиме черновика
    mainTable.value = null
    relations.value = []
    selectedTables.value = []
    fields.value = []
    previewCols.value = []
    previewRows.value = []
    
    if (newConnection.id) {
      try {
        // Загружаем файлы нового подключения
        await fetchConnectionFiles(newConnection.id)
        buildAllTables(fileUploadsCache.value)
        
        if (fileUploadsCache.value) {
          updateConnectionStatus(fileUploadsCache.value)
        }
        
        // Обновляем выбранные таблицы
        updateSelectedTables()
        
      } catch (error) {
        console.error('[DatasetPage] Ошибка при смене подключения:', error)
        // При ошибке очищаем все кеши
        fileUploadsCache.value = []
        allTablesOfConnection.value = []
      }
    } else {
      // Если подключение сброшено, очищаем все кеши
      fileUploadsCache.value = []
      allTablesOfConnection.value = []
    }
  }
}, { deep: true })

watch(previewLimit, async (val, old) => {
  if (val !== old && isPreviewVisible.value && dataset.value?.id) {
    await loadPreview()
    
    if (selectedConnection.value && fileUploadsCache.value) {
      updateConnectionStatus(fileUploadsCache.value)
    }
  }
})

watch(datasetId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await loadDataset(newId)
    
    if (selectedConnection.value && fileUploadsCache.value) {
      updateConnectionStatus(fileUploadsCache.value)
    }
  }
})

// Lifecycle
onMounted(async () => {
  if (datasetId.value) {
    await loadDataset(datasetId.value)
    
    if (selectedConnection.value && fileUploadsCache.value) {
      updateConnectionStatus(fileUploadsCache.value)
    }
  }
  
  // Загружаем предпросмотр после загрузки датасета
  if (mainTable.value && dataset.value?.id) {
    await loadPreview()
  }
})
</script>

<style scoped lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.layout {
  display: grid;
  position: relative;
  grid-template-rows: 56px 50px 1fr auto;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  grid-template-areas:
    "header header"
    "toolbar toolbar"
    "main main"
    "footer footer";
  height: 90vh;
  transition: grid-template-columns 0.4s ease;
  overflow: hidden;
}

.layout > *:nth-child(3) {
  grid-area: main;
  overflow: auto;
}

.layout > *:nth-child(4) {
  grid-area: footer;
  position: sticky;
  bottom: 0;
  background: var(--color-background, #fff);
}
</style>
