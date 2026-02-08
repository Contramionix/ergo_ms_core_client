<template>
  <div class="layout">
    <DatasetHeader  :header-name="editableDatasetName" :is-new-page="isNewPage" :can-create-dataset="canCreateDataset" :saving="saving" :save-success="saveSuccess" :is-dirty="computedIsDirty" @show-dataset-dialog="showDatasetDialog = true" @edit-dataset="handleEditDataset" @update:header-name="editableDatasetName = $event"/>
    <DatasetToolbar v-model:active-tab="activeTab" :is-preview-loading="isPreviewLoading" :connection-status="getConnectionStatus()" @refresh-fields="refreshFields" @toggle-preview="togglePreview" @add-field="addField"/>
    <DatasetMainContent :active-tab="activeTab" :selected-connection="selectedConnection" :main-table="mainTable" :relations="relations" :all-tables-of-connection="allTablesOfConnection" :selected-tables="selectedTables" :fields="fields" :preview-cols="previewCols" :preview-rows="previewRows" :dataset="dataset" :is-preview-visible="isPreviewVisible" :connection-status="getConnectionStatus()" @edit-relation="onEditRelation" @remove-relation="removeRelationById" @open-table-link-modal="openTableLinkModal" @tables-loaded="handleTablesLoaded" @remove-table="handleRemoveTable" @edit-field="onEditField" @update:fields="fields = $event" @update:selected-connection="selectedConnection = $event" @update:main-table="mainTable = $event" @update:active-tab="activeTab = $event" @resetAllRelations="handleResetAllRelations" @params-changed="paramsDirtyTick++"/>
    <DatasetFooter v-if="isPreviewVisible" :is-preview-visible="isPreviewVisible" :preview-rows="previewRows" :preview-cols="previewCols" :fields="fields" :dataset-id="currentDatasetId" :is-preview-loading="isPreviewLoading" :connection-status="getConnectionStatus()" @switch-to-sources="activeTab = 'sources'"/>
    <div class="dataset-modals">
      <FieldSettingsModal :show="showModal" :selected-field="selectedField" :all-tables-of-connection="allTablesOfConnection" :selected-connection="selectedConnection" :preview-cols="previewCols" :preview-rows="previewRows" @close="showModal = false" @source-save="onSourceSave"/>
      <RelationModal :show="showTableLinkModal" :all-tables-of-connection="allTablesOfConnection" :used-right-table-ids="usedRightTableIds" :editing-relation="editingRelation" :main-table="mainTable" :current-dataset-id="currentDatasetId" :selected-connection="selectedConnection" @close="showTableLinkModal = false" @relation-apply="handleRelationApply"/>
      <DatasetNameModal :show="showDatasetDialog" :dataset-name="dataset?.name" @saved="saveDataset" @update:show="showDatasetDialog = $event"/>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDatasetState } from '@/core/bi/Datasets/components/js/useDatasetState'
import { useDatasetActions } from '@/core/bi/Datasets/components/js/useDatasetActions'

import DatasetHeader from '@/core/bi/Datasets/DatasetHeader.vue'
import DatasetToolbar from '@/core/bi/Datasets/DatasetToolbar.vue'
import DatasetMainContent from '@/core/bi/Datasets/Sources/DatasetMainContent.vue'
import DatasetFooter from '@/core/bi/Datasets/DatasetFooter.vue'
import FieldSettingsModal from '@/core/bi/Datasets/components/FieldSettingsModal.vue'
import RelationModal from '@/core/bi/Datasets/components/RelationModal.vue'
import DatasetNameModal from '@/core/bi/Datasets/components/DatasetNameModal.vue'

const route = useRoute()
const router = useRouter()

const state = useDatasetState()
const actions = useDatasetActions(state)

const editableDatasetName = ref('')
const isLoadingDataset = ref(false)

const computedIsDirty = computed(() => {
  if (isDirty.value) return true
  if (origDatasetRef.value && editableDatasetName.value) {
    const origName = origDatasetRef.value.name || ''
    if (editableDatasetName.value !== origName) return true
  }
  return false
})

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
  activeTabFromUrlTab,
  urlTabFromActiveTab
} = state

const {
  saveDataset,
  editDataset,
  loadDataset,
  fetchConnectionFiles,
  updateConnectionStatus,
  buildAllTables,
  updateSelectedTables,
  loadPreview,
  refreshFields,
  handleRelationApply,
  removeRelationById,
  togglePreview,
  addField,
  handleRemoveTable,
  onSourceSave
} = actions

function clearDraftState() {
  mainTable.value = null
  relations.value = []
  selectedTables.value = []
  fields.value = []
  previewCols.value = []
  previewRows.value = []
}

async function refreshConnectionData(connectionId) {
  await fetchConnectionFiles(connectionId)
  buildAllTables(fileUploadsCache.value)
  if (fileUploadsCache.value) updateConnectionStatus(fileUploadsCache.value)
}

function tableBelongsToConnection(table, connection) {
  if (!table || !connection) return false
  if (connection.connector_type_display?.toLowerCase().includes('file') ||
      connection.connector_type?.toLowerCase().includes('файл')) {
    return table.file_id === connection.id
  }
  return !table.connection_id || table.connection_id === connection.id
}

function handleEditDataset(datasetName) {
  const name = datasetName || editableDatasetName.value
  if (!dataset.value?.id) saveDataset(name)
  else editDataset(name)
}

function onEditField(field) {
  selectedField.value = field
  showModal.value = true
}

function getConnectionStatus() {
  if (!selectedConnection.value) return 'disconnected'
  if (selectedConnection.value.hasMissingFiles || selectedConnection.value.hasProblematicFiles) {
    return 'error'
  }
  return 'connected'
}

function handleTablesLoaded(files) {
  fileUploadsCache.value = files
  buildAllTables(files)
  if (selectedConnection.value && files) updateConnectionStatus(files)

  if (mainTable.value && selectedConnection.value && !tableBelongsToConnection(mainTable.value, selectedConnection.value)) {
    clearDraftState()
    return
  }

  if (mainTable.value && /^temp_[a-f0-9]{32}/.test(mainTable.value.display_name || '')) {
    const match = files.find(
      f => mainTable.value.file_id
        ? f.id === mainTable.value.file_id
        : f.columns_info && mainTable.value.columns_info &&
          JSON.stringify(f.columns_info.columns) === JSON.stringify(mainTable.value.columns_info.columns)
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

async function onEditRelation(rel, idx) {
  editingRelation.value = JSON.parse(JSON.stringify(rel))
  editingRelationIndex.value = idx

  if (selectedConnection.value?.id) {
    await refreshConnectionData(selectedConnection.value.id)
    const rightTable = allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
    if (!rightTable) {
      relations.value.splice(idx, 1)
      editingRelation.value = null
      editingRelationIndex.value = null
      return
    }
    if (!tableBelongsToConnection(rightTable, selectedConnection.value)) {
      relations.value.splice(idx, 1)
      editingRelation.value = null
      editingRelationIndex.value = null
      if (mainTable.value && !tableBelongsToConnection(mainTable.value, selectedConnection.value)) {
        clearDraftState()
      }
      return
    }
  }
  showTableLinkModal.value = true
}

function handleResetAllRelations() {
  relations.value = []
  fields.value = []
  previewCols.value = []
  previewRows.value = []
  updateSelectedTables()
}

async function openTableLinkModal() {
  if (!selectedConnection.value?.id) return

  await refreshConnectionData(selectedConnection.value.id)

  if (relations.value.length > 0) {
    const validRelations = relations.value.filter(rel => {
      const rightTable = allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
      return rightTable && tableBelongsToConnection(rightTable, selectedConnection.value)
    })
    if (validRelations.length < relations.value.length) relations.value = validRelations
  }

  if (mainTable.value && !tableBelongsToConnection(mainTable.value, selectedConnection.value)) {
    clearDraftState()
  }

  editingRelation.value = null
  editingRelationIndex.value = null
  showTableLinkModal.value = true
}

watch(mainTable, async (val, oldVal) => {
  if (!val) return
  if (val.file_type && !val.file_id) val.file_id = val.id

  if (val && selectedConnection.value && !oldVal && !tableBelongsToConnection(val, selectedConnection.value)) {
    clearDraftState()
    return
  }

  if ((val.file_id || val.table_name) && selectedConnection.value) {
    await loadPreview()
    if (fileUploadsCache.value) updateConnectionStatus(fileUploadsCache.value)
  }
  updateSelectedTables()
})

watch(selectedConnection, async (newConnection, oldConnection) => {
  if (!newConnection || !oldConnection || newConnection.id === oldConnection.id) return

  clearDraftState()

  if (newConnection.id) {
    try {
      await refreshConnectionData(newConnection.id)
      updateSelectedTables()
    } catch {
      fileUploadsCache.value = []
      allTablesOfConnection.value = []
    }
  } else {
    fileUploadsCache.value = []
    allTablesOfConnection.value = []
  }
}, { deep: true })

watch(datasetId, async (newId, oldId) => {
  if (newId && newId !== oldId && !isLoadingDataset.value) {
    isLoadingDataset.value = true
    try {
      await loadDataset(newId)
      if (selectedConnection.value && fileUploadsCache.value) {
        updateConnectionStatus(fileUploadsCache.value)
      }
    } finally {
      isLoadingDataset.value = false
    }
  }
}, { immediate: true })

watch(() => headerName.value, (newName) => {
  if (newName !== editableDatasetName.value) editableDatasetName.value = newName
}, { immediate: true })

watch(() => dataset.value?.name, (newName) => {
  if (newName && newName !== editableDatasetName.value) editableDatasetName.value = newName
})

watch(() => route.params.tab, (urlTab) => {
  const tab = activeTabFromUrlTab(urlTab)
  if (activeTab.value !== tab) activeTab.value = tab
}, { immediate: true })

watch(activeTab, (tab) => {
  const urlTab = urlTabFromActiveTab(tab)
  const currentUrlTab = route.params.tab
  if (currentUrlTab !== urlTab) {
    const basePath = isNewPage.value ? '/bi/datasets/new' : `/bi/datasets/${datasetId.value}`
    router.replace(`${basePath}/${urlTab}`)
  }
}, { immediate: true })

onMounted(async () => {
  if (mainTable.value && dataset.value?.id) await loadPreview()
})
</script>

<style scoped lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.layout {
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  height: 95vh;
  min-height: 800px;
  overflow: hidden;
}

.layout > :nth-child(1) {
  flex-shrink: 0;
}

.layout > :nth-child(2) {
  flex-shrink: 0;
}

.layout > :nth-child(3) {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.layout > :nth-child(4) {
  flex-shrink: 0;
}

.dataset-modals {
  position: absolute;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.dataset-modals > * {
  pointer-events: auto;
}
</style>