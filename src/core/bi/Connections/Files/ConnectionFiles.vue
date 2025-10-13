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
                    <input type="file" ref="fileInput" accept=".csv,.xlsx,.txt" multiple @change="handleFileUploadWithLoading"
                        style="display: none" />
                    <input type="file" ref="replaceInput" accept=".csv,.xlsx,.txt" style="display: none" @change="handleFileReplace" />
                </div>
            </div>

            <div class="file-list">
                <div v-if="tempUploadedFiles.length">
                    <div class="section-header">Новые файлы</div>
                    <FileItem v-for="file in tempUploadedFiles" :key="file.temp_path" :file="file" :isTemp="true"
                        :isActive="selectedFile === file" @select="selectFile" @tooltip-show="onIconHover"
                        @tooltip-hide="hideTooltipWithDelay" @delete="() => removeTempFile(file)"
                        @pick-sheets="openSheetPicker" />
                </div>
                <div v-if="uploadedFiles.length">
                    <div class="section-header">Загруженные ранее</div>
                    <FileItem v-for="file in uploadedFiles" :key="file.id" :file="file" :isTemp="false"
                        :isActive="selectedFile === file" @replace="replaceFile" @rename="renameFile"
                        @delete="deleteFile" @select="selectFile" @tooltip-show="onIconHover"
                        @tooltip-hide="hideTooltipWithDelay" @pick-sheets="openSheetPicker" />
                </div>
            </div>
        </aside>

        <header class="file_area_header">
            <div class="file_area_header_label">
                <Waypoints />
                <h4 :title="connectionName">{{ connectionName || '...' }}</h4>
                <TriangleAlert 
                    v-if="hasMissingFiles" 
                    class="alert-icon" 
                    :size="20" 
                    @mouseenter="onAlertHover"
                    @mouseleave="hideTooltipWithDelay"
                />
                <TriangleAlert 
                    v-else-if="hasNoFiles" 
                    class="alert-icon" 
                    :size="20" 
                    @mouseenter="onNoFilesHover"
                    @mouseleave="hideTooltipWithDelay"
                />
            </div>
            <div class="file_area_header_buttons">
                <div 
                    class="button-wrapper"
                    @mouseenter="isCreateDatasetDisabled ? onDisabledButtonHover($event) : null"
                    @mouseleave="isCreateDatasetDisabled ? hideTooltipWithDelay() : null"
                >
                    <button 
                        type="button" 
                        class="btn btn-secondary" 
                        :class="{ 'disabled-button': isCreateDatasetDisabled }"
                        @click="handleCreateDatasetClick"
                    >Создать датасет</button>
                </div>
                <button type="button" v-if="showSaveChangesButton" class="btn btn-success" @click="saveChanges">Сохранить изменения</button>
            </div>
        </header>
        <main class="file_area">
            <!-- Анимация загрузки при замене файла -->
            <div v-if="isReplacing" class="loading-overlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <h3>Заменяем файл...</h3>
                    <p>Пожалуйста, подождите</p>
                </div>
            </div>
            
            <!-- Анимация загрузки при загрузке файла -->
            <div v-else-if="isUploading" class="loading-overlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <h3>Загружаем файл...</h3>
                    <p>Пожалуйста, подождите</p>
                </div>
            </div>
            
            <!-- Анимация загрузки содержимого файла -->
            <div v-else-if="isLoadingContent" class="loading-overlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <h3>Загружаем содержимое файла...</h3>
                    <p>Пожалуйста, подождите</p>
                </div>
            </div>
            
            <!-- Плейсхолдер для отсутствующих файлов -->
            <div v-else-if="hasNoFiles" class="empty-placeholder">
                <EmptyImage class="empty-image" />
                <div class="empty-text">
                    <h3>Отсутствуют файлы в подключении</h3>
                    <p>Загрузите до 10 файлов в одно подключение</p>
                </div>
            </div>
            
            <!-- Плейсхолдер для ошибки загрузки файла - должен быть перед FilePreviewPanel -->
            <div v-else-if="hasSelectedFileError" class="error-placeholder">
                <div class="error-content">
                    <h3>Упс... Произошла ошибка</h3>
                    <p>Мы не смогли загрузить содержимое файла, код ошибки: {{ 
                        fileError?.code || 
                        selectedFile?.error?.code || 
                        selectedFile?.status || 
                        'неизвестен' 
                    }}</p>
                </div>
            </div>
            
            <!-- Отображение выбранного файла только если нет ошибки -->
            <FilePreviewPanel v-else-if="selectedFile && !hasSelectedFileError" :file="selectedFile" :isLoading="isLoadingContent" />
        </main>
    </div>

    <transition name="fade">
        <div v-show="showTooltip" :style="tooltipStyle" class="tooltip show" :class="tooltipClass">{{ tooltipText }}</div>
    </transition>

    <XlsxSheetPicker 
        :visible="isSheetPickerVisible" 
        :filename="currentUploadFile?.name || ''" 
        :sheets="availableSheets" 
        :currentSheet="sheetBeingEdited" 
        :singleSelect="!!currentUploadFile?.replaceFileId"
        @confirm="handleSheetSelectionOrReplace" 
        @cancel="isSheetPickerVisible = false" />
</template>

<script setup>
import { watch, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, Upload, Waypoints, TriangleAlert } from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager'
import FileItem from './FileItem.vue'
import FilePreviewPanel from './FilePreviewPanel.vue'
import XlsxSheetPicker from './FilePreview/XlsxSheetPicker.vue'
import EmptyImage from './components/EmptyImage.vue'

import { useRedirectIfFileConnection } from '@/core/bi/Datasets/components/js/useRedirectIfFileConnection'
import { useFileUploader } from '@/core/bi/Datasets/components/js/useFileUploader'
import { useTooltip } from '@/core/bi/Datasets/components/js/useTooltip'
import { useFileList } from '@/core/bi/Datasets/components/js/useFileList'
import { useFileActions } from '@/core/bi/Datasets/components/js/useFileActions'

const router = useRouter()
const route = useRoute()

const fileInput = ref(null)
const replaceInput = ref(null)
const fileToReplace = ref(null)
const selectedFile = ref(null)
const sheetBeingEdited = ref(null)
const fileError = ref(null)

const isSheetPickerVisible = ref(false)
const currentUploadFile = ref(null)
const availableSheets = ref([])
const uploadedFiles = ref([])
const tempUploadedFiles = ref([])
const isReplacing = ref(false)
const isUploading = ref(false)
const isLoadingContent = ref(false)

const connectionId = ref(null)

useRedirectIfFileConnection()
const { tooltipText, tooltipStyle, showTooltip, tooltipClass, onIconHover, hideTooltipWithDelay, tooltipTimeout } = useTooltip()
const { removeTempFile, openSheetPicker, selectFile: originalSelectFile, loadUserFiles, getSheetNameFromFile } = useFileList(tempUploadedFiles, selectedFile, uploadedFiles, currentUploadFile, availableSheets, sheetBeingEdited, isSheetPickerVisible, connectionId)


function selectFile(file) {
  fileError.value = null
  isLoadingContent.value = true
  
  // Имитируем небольшую задержку для показа анимации
  setTimeout(() => {
    originalSelectFile(file)
    isLoadingContent.value = false
  }, 500)
}
const { uploadFile, uploadFileRaw, finalizeUploads, handleSheetSelection, handleFileUpload } = useFileUploader(tempUploadedFiles, selectedFile, isSheetPickerVisible, currentUploadFile, availableSheets, loadUserFiles, connectionId)
const { deleteFile, handleFileReplace, handleFileReplaceWithSheets, renameFile } = useFileActions(uploadedFiles, selectedFile, fileToReplace, loadUserFiles, connectionId, isSheetPickerVisible, currentUploadFile, availableSheets, isReplacing)

function goToNewConnection() {
    router.push('/bi/connections/new/')
}

function triggerFileUpload() {
    fileInput.value?.click()
}

async function handleFileUploadWithLoading(event) {
    isUploading.value = true
    try {
        await handleFileUpload(event)
    } finally {
        isUploading.value = false
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

function onAlertHover(event) {
    onIconHover(event, "В подключении возникла проблема: отсутствует один или несколько файлов в базе данных", "error-tooltip")
}

function onNoFilesHover(event) {
    onIconHover(event, "В подключении отсутствуют файлы", "error-tooltip")
}

function onDisabledButtonHover(event) {
    if (tooltipTimeout.value) clearTimeout(tooltipTimeout.value)
    tooltipText.value = "Подключение имеет ряд проблем, решите их, прежде чем создавать датасет"
    tooltipClass.value = "error-tooltip button-tooltip"
    showTooltip.value = true

    const button = event.target.querySelector('button') || event.target
    const rect = button.getBoundingClientRect()
    tooltipStyle.value = {
      top: `${rect.bottom + window.scrollY + 8}px`,
      left: `${rect.left + rect.width / 2 + window.scrollX}px`,
      transform: 'translateX(-50%)',
      position: 'absolute'
    }
}

function handleCreateDatasetClick(event) {
    if (isCreateDatasetDisabled.value) {
        event.preventDefault()
        event.stopPropagation()
        return false
    }
}

function handleSheetSelectionOrReplace(sheets) {
    if (currentUploadFile.value?.replaceFileId) {
        handleFileReplaceWithSheets(sheets)
    } else {
        handleSheetSelection(sheets)
    }
}

async function loadConnectionFiles() {
  const currentConnectionId = route.params.pk
  if (!currentConnectionId) {
    return
  }

  console.log('[loadConnectionFiles] Загружаю файлы для подключения:', currentConnectionId)

  try {
    const res = await apiClient.getUploadedFiles(`bi_analysis/bi_datasets/connection/${currentConnectionId}/files/`)
    console.log('[loadConnectionFiles] Ответ сервера:', res)
    
    if (res.success) {
      uploadedFiles.value = res.data
      fileError.value = null
      console.log('[loadConnectionFiles] Загружено файлов:', res.data.length)
      console.log('[loadConnectionFiles] Файлы:', res.data)
    } else {
      console.error('[loadConnectionFiles] Ошибка получения файлов:', res.errors)
      fileError.value = {
        code: res.status || 500,
        message: res.errors || 'Неизвестная ошибка'
      }
    }
  } catch (error) {
    console.error('[loadConnectionFiles] Исключение при загрузке файлов:', error)
    fileError.value = {
      code: error.response?.status || 500,
      message: error.message || 'Ошибка сети'
    }
  }
}

const showSaveChangesButton = computed(() => {
    return selectedFile.value?.originalFile != null
})

const hasMissingFiles = computed(() => {
  return uploadedFiles.value.some(file => {
    return file.missing === true || 
           file.exists === false || 
           file.file_not_found === true ||
           file.status === 'missing' ||
           file.status === 'not_found' ||
           !file.file_path ||
           file.error
  })
})

const hasNoFiles = computed(() => {
  return uploadedFiles.value.length === 0 && tempUploadedFiles.value.length === 0
})

const hasSelectedFileError = computed(() => {
  if (!selectedFile.value) return false
  
  return selectedFile.value.missing === true || 
         selectedFile.value.exists === false || 
         selectedFile.value.file_not_found === true ||
         selectedFile.value.status === 'missing' ||
         selectedFile.value.status === 'not_found' ||
         selectedFile.value.status === 'error' ||
         !selectedFile.value.file_path ||
         selectedFile.value.error ||
         fileError.value !== null
})

const isCreateDatasetDisabled = computed(() => {
  return hasMissingFiles.value || hasNoFiles.value
})

async function saveChanges() {
  if (!tempUploadedFiles.value.length) {
    alert('Нет новых файлов для сохранения.')
    return
  }

  try {
    await finalizeUploads(connectionId.value)
    alert('Файлы успешно сохранены.')
    await loadUserFiles(connectionId.value)
  } catch (err) {
    alert('Не удалось сохранить файлы.')
  }
}

const connectionName = ref('')

async function loadConnectionInfo() {
  const currentConnectionId = route.params.pk
  if (!currentConnectionId) return

  const res = await apiClient.get(`bi_analysis/bi_connections/${currentConnectionId}/`)
  if (res.success && res.data?.name) {
    connectionName.value = res.data.name
  }
}

watch(() => route.params.pk || route.params.connectionId, async (newPk) => {
  if (newPk) {
    connectionId.value = Number(newPk)

    try {
      await loadConnectionInfo()
      await loadConnectionFiles()
    } catch (error) {
      // Ошибка загрузки данных подключения
    }
  }
}, { immediate: true })
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
    transition: opacity 0.05s ease, transform 0.05s ease;
}

.tooltip.show {
    opacity: 1;
    transform: translateY(0) translateX(-50%);
}

.tooltip.error-tooltip {
    border: 1px solid var(--color-accent);
}

.tooltip.button-tooltip {
    padding: 8px 12px;
    white-space: normal;
    max-width: 250px;
    word-wrap: break-word;
    line-height: 1.3;
    z-index: 1000;
}

html,
body {
    height: 100%;
    color: var(--color-primary-text);
}

.layout {
    display: grid;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    grid-template-columns: 260px 1fr;
    grid-template-rows: 61px 1fr;
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
    background-color: var(--color-primary-background);
    border-top-left-radius: 12px;
    border-bottom-left-radius: 12px;
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

.file_area_header_buttons {
    display: flex;
    justify-content: flex-end;
    margin-left: auto;
    gap: 10px;
}

.button-wrapper {
    display: inline-block;
}

.file_area {
    grid-area: chat;
    background-color: var(--color-secondary-background);
    padding: 1rem;
    overflow-y: auto;
    position: relative;
    border-left: 1px solid var(--color-border);
    border-bottom-right-radius: 12px;
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
    background-color: var(--color-hover-background);
}

.icon {
    width: 18px;
    height: 18px;
    color: var(--color-primary-text);
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

.btn-outline-danger {
    width: 100%;
    height: 2rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.section-header {
    margin-top: 10px;
    margin-bottom: 10px;
    font-weight: bold;
}

.btn-success {
    width: 13rem;
    height: 2rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary-text);
}

.btn-outline-success {
    width: 13rem;
    height: 2rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-secondary {
    width: 10rem;
    height: 2rem;
    border-radius: 6px;
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary-text);
    border: 1px solid var(--color-border);
    box-shadow: 0 0 0 0;
}

.btn-secondary:hover {
    background-color: var(--color-hover-background);
}

.disabled-button {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
    background-color: transparent !important;
    pointer-events: none !important;
}

.disabled-button:hover {
    cursor: not-allowed !important;
    background-color: transparent !important;
}

/* Дополнительные стили для более надежного отображения курсора */
.file_area_header_buttons .disabled-button {
    cursor: not-allowed !important;
}

.file_area_header_buttons .disabled-button:hover {
    cursor: not-allowed !important;
}

.file_area_header_label{
    display: flex;
    align-items: center;
    gap: 5px;
}

.file_area_header_label h4 {
    padding: 0 0 5px 0;
    margin: 0;
    line-height: 1;
    max-width: 24rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.alert-icon {
    color: var(--color-accent);
    cursor: pointer;
    transition: color 0.2s ease;
    flex-shrink: 0;
}

.alert-icon:hover {
    color: #ff5252;
}

/* Общие стили анимации загрузки */
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.loading-content {
    text-align: center;
    padding: 2rem;
    background: var(--color-primary-background);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
}

.loading-content h3 {
    margin: 1rem 0 0.5rem 0;
    color: var(--color-primary-text);
    font-size: 1.2rem;
}

.loading-content p {
    margin: 0;
    color: var(--color-secondary-text);
    font-size: 0.9rem;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border);
    border-top: 3px solid var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Стили для плейсхолдера отсутствующих файлов */
.empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 2rem;
    margin-top: -1rem;
}

.empty-image {
    width: 360px;
    height: 360px;
    opacity: 0.6;
}

.empty-text {
    margin-top: -3rem;
}

.empty-text h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-primary-text);
    font-size: 1.25rem;
    font-weight: 600;
}

.empty-text p {
    margin: 0;
    color: var(--color-secondary-text);
    font-size: 0.95rem;
    line-height: 1.4;
}

/* Стили для плейсхолдера ошибки */
.error-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 2rem;
    position: relative;
    z-index: 10;
    background-color: var(--color-secondary-background);
}

.error-content {
    max-width: 400px;
}

.error-content h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-primary-text);
    font-size: 1.5rem;
    font-weight: 600;
}

.error-content p {
    margin: 0;
    color: var(--color-secondary-text);
    font-size: 1rem;
    line-height: 1.4;
}
</style>