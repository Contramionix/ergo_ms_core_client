<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="name">
        <div class="name_container">
          <button @click="goToNewConnection" class="icon-button" title="Новое подключение">
            <ArrowLeft class="icon" />
          </button>
          <img src="/src/core/bi/assets/icons/folder_windows_style.svg" class="icon_name" />
          <div class="title">Файлы</div>
        </div>
      </div>

      <div class="file-upload-button">
        <div class="upload-button">
          <button class="btn btn-outline-danger" @click="triggerFileUpload">
            <Upload class="icon_upload" />Загрузить файл
          </button>
          <input type="file" ref="fileInput" accept=".csv,.xlsx,.txt" multiple @change="handleFileUpload" style="display: none" />
          <input type="file" ref="replaceInput" accept=".csv,.xlsx,.txt" style="display: none" @change="handleFileReplace" />
        </div>
      </div>

      <div class="file-list">
        <div v-if="unattachedFiles.length">
          <div class="section-header">Новые файлы</div>
          <FileItem v-for="file in unattachedFiles" :key="file.id" :file="file" :isTemp="false"
            :isActive="selectedFile === file" @select="selectFile" @tooltip-show="onIconHover"
            @tooltip-hide="hideTooltipWithDelay" @delete="deleteUnattachedFile" @pick-sheets="openSheetPicker" />
        </div>
        <div v-if="uploadedFiles.length">
          <div class="section-header">Загруженные ранее</div>
          <FileItem v-for="file in uploadedFiles" :key="file.id" :file="file" :isTemp="false"
            :isActive="selectedFile === file" @replace="replaceFile" @rename="renameFile" @delete="deleteFile"
            @select="selectFile" @tooltip-show="onIconHover" @tooltip-hide="hideTooltipWithDelay"
            @pick-sheets="openSheetPicker" />
        </div>
      </div>
    </aside>

    <header class="file_area_header">
      <div class="file_area_header_label">
        <h4>Новое подключение</h4>
      </div>
      <div class="file_area_header_buttons">
        <button type="button" class="btn btn-primary" @click="openConnectionDialog" :disabled="!unattachedFiles.length || isCreatingConnection">
          <span v-if="isCreatingConnection" class="spinner-border spinner-border-sm me-2" role="status"></span>
          {{ isCreatingConnection ? 'Создание...' : 'Создать подключение' }}
        </button>
      </div>
    </header>
    <main class="file_area">
      <FilePreviewPanel v-if="selectedFile" :file="selectedFile" />
    </main>
  </div>

  <transition name="fade">
    <div v-show="showTooltip" :style="tooltipStyle" class="tooltip show">{{ tooltipText }}</div>
  </transition>

  <XlsxSheetPicker 
    :visible="isSheetPickerVisible" 
    :filename="currentUploadFile?.name || ''" 
    :sheets="availableSheets" 
    :currentSheet="sheetBeingEdited" 
    :singleSelect="!!currentUploadFile?.replaceFileId"
    @confirm="handleSheetSelectionOrReplace" 
    @cancel="isSheetPickerVisible = false" />
  <ConnectionNameDialog v-model:visible="showConnectionDialog" :connectorType="connectorType" :connectionConfig="connectionConfig" :connectionFiles="unattachedFiles" @saved="createConnection"/>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Upload } from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import FileItem from './FileItem.vue'
import FilePreviewPanel from './FilePreviewPanel.vue'
import XlsxSheetPicker from './FilePreview/XlsxSheetPicker.vue'
import ConnectionNameDialog from '../components/ConnectionNameDialog.vue'

import { useToast } from 'vue-toastification'
import { useFileUploader } from '@/core/bi/Datasets/components/js/useFileUploader'
import { useTooltip } from '@/core/bi/Datasets/components/js/useTooltip'
import { useFileList } from '@/core/bi/Datasets/components/js/useFileList'
import { useFileActions } from '@/core/bi/Datasets/components/js/useFileActions'

const router = useRouter()
const toast = useToast()
const fileInput = ref(null)
const replaceInput = ref(null)
const fileToReplace = ref(null)
const selectedFile = ref(null)
const sheetBeingEdited = ref(null)

const isSheetPickerVisible = ref(false)
const currentUploadFile = ref(null)
const availableSheets = ref([])
const uploadedFiles = ref([])
const tempUploadedFiles = ref([])

const showConnectionDialog = ref(false)
const connectorType = ref('')
const connectionConfig = ref({})
const isCreatingConnection = ref(false)

function goToNewConnection() {
  router.push('/bi/connections/new/')
}

function triggerFileUpload() {
  fileInput.value?.click()
}

const { tooltipText, tooltipStyle, showTooltip, onIconHover, hideTooltipWithDelay } = useTooltip()
const { unattachedFiles, loadUnattachedFiles, removeUnattachedFile, openSheetPicker, selectFile, loadUserFiles, getSheetNameFromFile } = useFileList(tempUploadedFiles, selectedFile, uploadedFiles, currentUploadFile, availableSheets, sheetBeingEdited, isSheetPickerVisible, null)
const { handleSheetSelection, handleFileUpload } = useFileUploader(tempUploadedFiles, selectedFile, isSheetPickerVisible, currentUploadFile, availableSheets, loadUserFiles, null, uploadedFiles, null, null, loadUnattachedFiles)
const { deleteFile, handleFileReplace, handleFileReplaceWithSheets, renameFile } = useFileActions(uploadedFiles, selectedFile, fileToReplace, loadUserFiles, null, isSheetPickerVisible, currentUploadFile, availableSheets)

onMounted(() => {
  loadUnattachedFiles()
})

async function deleteUnattachedFile(file) {
  try {
    await apiClient.delete(endpoints.bi.uploadDelete(file.id))
    removeUnattachedFile(file)
  } catch (e) {
  }
}

function replaceFile(file) {
  if (file.file_type === 'xlsx' && file.pendingSheets?.length) {
    currentUploadFile.value = file
    availableSheets.value = file.pendingSheets
    sheetBeingEdited.value = getSheetNameFromFile(file.name)
    isSheetPickerVisible.value = true
  } else {
    fileToReplace.value = file
    replaceInput.value?.click()
  }
}

function handleSheetSelectionOrReplace(sheets) {
  if (currentUploadFile.value?.replaceFileId) {
    handleFileReplaceWithSheets(sheets)
  } else {
    handleSheetSelection(sheets)
  }
}

function openConnectionDialog() {
  connectorType.value = 'file'
  connectionConfig.value = { source: 'local_upload' }
  showConnectionDialog.value = true
}

async function createConnection(data) {
  showConnectionDialog.value = false
  isCreatingConnection.value = true
  try {
    const newConnectionId = data?.id
    if (!newConnectionId) {
      toast.error('Не удалось создать подключение')
      isCreatingConnection.value = false
      return
    }
    const list = unattachedFiles.value
    if (list.length) {
      await Promise.all(list.map(file =>
        apiClient.patch(endpoints.bi.uploadDelete(file.id), { connection: newConnectionId })
      ))
    }
    toast.success('Подключение успешно создано и файлы загружены!')
    router.push(`/bi/connections/${newConnectionId}/files/`)
  } catch (err) {
    toast.error('Произошла ошибка при создании подключения: ' + (err?.message || err))
  } finally {
    isCreatingConnection.value = false
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.tooltip {
  position: absolute;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  white-space: nowrap;
  z-index: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  opacity: 0;
  transform: translateY(-5px) translateX(-50%);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tooltip.show {
  opacity: 1;
  transform: translateY(0) translateX(-50%);
}

html,
body {
  height: 100%;
  font-family: sans-serif;
  color: #fff;
}

.layout {
  display: grid;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  grid-template-columns: 260px 1fr;
  grid-template-rows: 56px 1fr;
  grid-template-areas:
    "sidebar header"
    "sidebar chat";
  height: 85vh;
  background-color: transparent;
}

.sidebar {
  grid-area: sidebar;
  background-color: transparent;
  padding: 1rem;
  border-right: 1px solid var(--color-border);
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  background-color: var(--color-primary-background);
}

.file_area_header {
  position: relative;
  grid-area: header;
  background-color: var(--color-primary-background);
  display: flex;
  gap: 20px;
  height: 61px;
  align-items: center;
  padding: 0 1rem;
  border-top-right-radius: 12px;
  border-bottom: 1px solid var(--color-border);
}

.file_area_header_buttons{
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
  gap: 10px;
}

.file_area {
  grid-area: chat;
  background-color: var(--color-primary-background);
  padding: 1rem;
  border-bottom-right-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.icon-button {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s ease;
  border-radius: 6px;
  margin-right: 10px;
}

.icon-button:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.icon {
  width: 18px;
  height: 18px;
  color: var(--color-primary-text);
}

.icon:hover{
  color: var(--color-secondary-text);
}

.icon_name {
  width: 32px;
  height: 32px;
  margin-right: 5px;
}

.icon_upload {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  vertical-align: middle;
}

.title {
  font-weight: bolder;
  color: var(--color-primary-text);
}

.name {
  font-size: 1.2rem;
  margin-inline: -1rem;
  padding-inline: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.name_container {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-bottom: 0.75rem;
}

.file-list {
  list-style: none;
  line-height: 1.8;
  font-size: 0.95rem;
  color: var(--color-secondary-text);
  padding-top: 5px;
}

.file-upload-button {
  position: relative;
  margin-top: 20px;
  margin-bottom: 20px;
}

.file-upload-button::after {
  content: '';
  position: absolute;
  bottom: -20px;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--color-border);
}

.section-header {
  margin-top: 10px;
  margin-bottom: 10px;
  font-weight: bold;
}

.btn-primary {
  padding: 0.2rem 0.75rem 0.2rem 0.75rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
}

.btn-outline-secondary {
  width: 10rem;
  height: 2rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
}

.btn-outline-danger {
  width: 100%;
  height: 2rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

@media (max-width: 576px) {
  .btn-primary,
  .btn-outline-secondary,
  .btn-outline-danger {
    font-size: 0.75rem;
  }
}

@media (min-width: 577px) and (max-width: 768px) {
  .btn-primary,
  .btn-outline-secondary,
  .btn-outline-danger {
    font-size: 0.8125rem;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .btn-primary,
  .btn-outline-secondary,
  .btn-outline-danger {
    font-size: 0.875rem;
  }
}

@media (min-width: 1201px) {
  .btn-primary,
  .btn-outline-secondary,
  .btn-outline-danger {
    font-size: 0.9375rem;
  }
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
}

.me-2 {
  margin-right: 0.5rem;
}
</style>