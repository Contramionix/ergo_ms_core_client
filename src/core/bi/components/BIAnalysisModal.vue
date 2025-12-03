<template>
  <div 
    v-if="show" 
    class="bi-analysis-modal fade show d-block" 
    tabindex="-1"
    @click.self="handleClose"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <div class="d-flex align-items-center gap-2">
            <BarChart3 :size="24" class="text-primary" />
            <h5 class="modal-title mb-0">Быстрый BI Анализ</h5>
          </div>
          <button 
            type="button" 
            class="btn-close" 
            @click="handleClose"
            :disabled="isProcessing"
          ></button>
        </div>
        
        <div class="modal-body">
          <!-- Шаг 1: Выбор подключения -->
          <div v-if="!selectedConnection" class="step-content">
            <h6 class="mb-3">Шаг 1: Выберите подключение</h6>
            <div v-if="loadingConnections" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
              </div>
            </div>
            <div v-else-if="connectionsError" class="alert alert-danger">
              {{ connectionsError }}
            </div>
            <div v-else-if="connections.length === 0" class="alert alert-info">
              У вас пока нет подключений. Создайте подключение в модуле BI.
            </div>
            <div v-else class="connection-grid">
              <div
                v-for="connection in connections"
                :key="connection.id"
                class="connection-card"
                :class="{ 'connection-card--selected': selectedConnectionId === connection.id }"
                @click="selectConnection(connection)"
              >
                <div class="connection-card__icon">
                  <Database :size="20" />
                </div>
                <div class="connection-card__info">
                  <div class="connection-card__name">{{ connection.name }}</div>
                  <div class="connection-card__meta">
                    <span class="badge bg-secondary">{{ connection.connector_type_display || connection.connector_type }}</span>
                  </div>
                </div>
                <div v-if="selectedConnectionId === connection.id" class="connection-card__check">
                  <Check :size="18" />
                </div>
              </div>
            </div>
          </div>

          <!-- Шаг 2: Выбор файла -->
          <div v-else-if="!selectedFile" class="step-content">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0">Шаг 2: Выберите файл</h6>
              <button class="btn btn-sm btn-outline-secondary" @click="changeConnection">
                <ArrowLeft :size="14" class="me-1" />
                Назад
              </button>
            </div>
            <div class="selected-connection-info mb-3">
              <Database :size="14" class="me-1" />
              <span class="text-muted">{{ selectedConnection.name }}</span>
            </div>

            <!-- Drag & Drop зона -->
            <div
              class="drop-zone mb-3"
              :class="{ 
                'drop-zone--active': isDragOver,
                'drop-zone--uploading': isUploadingFile
              }"
              @drop.prevent="handleDrop"
              @dragover.prevent="isDragOver = true"
              @dragenter.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
            >
              <div v-if="isUploadingFile" class="drop-zone__content">
                <div class="spinner-border spinner-border-sm text-primary mb-2" role="status">
                  <span class="visually-hidden">Загрузка...</span>
                </div>
                <div class="text-muted">Загрузка файла...</div>
              </div>
              <div v-else class="drop-zone__content">
                <Upload :size="32" class="mb-2 text-primary" />
                <div class="drop-zone__text">
                  <strong>Перетащите файл сюда</strong>
                  <span class="text-muted">или</span>
                  <label for="file-upload-input" class="drop-zone__link">выберите файл</label>
                </div>
                <input
                  id="file-upload-input"
                  type="file"
                  ref="fileInput"
                  accept=".csv,.xlsx,.txt"
                  class="d-none"
                  @change="handleFileSelect"
                />
                <small class="text-muted">Поддерживаемые форматы: CSV, XLSX, TXT (макс. 200 МБ)</small>
              </div>
            </div>

            <div v-if="uploadError" class="alert alert-danger mb-3">
              {{ uploadError }}
            </div>

            <div v-if="loadingFiles" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
              </div>
            </div>
            <div v-else-if="filesError" class="alert alert-danger">
              {{ filesError }}
            </div>
            <div v-else-if="files.length === 0 && !isUploadingFile" class="alert alert-info">
              В этом подключении нет файлов. Загрузите файл выше.
            </div>
            <div v-else-if="files.length > 0" class="file-grid">
              <div
                v-for="file in files"
                :key="file.id"
                class="file-card"
                :class="{ 'file-card--selected': selectedFileId === file.id }"
                @click="selectFile(file)"
              >
                <div class="file-card__icon">
                  <FileSpreadsheet :size="20" />
                </div>
                <div class="file-card__info">
                  <div class="file-card__name">{{ file.name }}</div>
                  <div class="file-card__meta">
                    <span class="badge bg-secondary">{{ file.file_type }}</span>
                  </div>
                </div>
                <div v-if="selectedFileId === file.id" class="file-card__check">
                  <Check :size="18" />
                </div>
              </div>
            </div>
          </div>

          <!-- Шаг 3: Действия с файлом -->
          <div v-else class="step-content">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h6 class="mb-0">Выберите действие</h6>
              <button class="btn btn-sm btn-outline-secondary" @click="changeFile">
                <ArrowLeft :size="14" class="me-1" />
                Назад
              </button>
            </div>
            <div class="selected-info mb-4">
              <div class="selected-info-item">
                <Database :size="14" />
                <span>{{ selectedConnection.name }}</span>
              </div>
              <div class="selected-info-item">
                <FileSpreadsheet :size="14" />
                <span>{{ selectedFile.name }}</span>
              </div>
            </div>
            
            <div class="action-buttons">
              <button 
                class="btn btn-success btn-lg action-button"
                @click="goToCreateChart"
              >
                <BarChart3 :size="24" class="me-2" />
                Построить график
              </button>
              <button 
                class="btn btn-danger btn-lg action-button"
                @click="goToCreateDataset"
              >
                <Database :size="24" class="me-2" />
                Перейти к созданию датасета
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button 
            type="button" 
            class="btn btn-secondary" 
            @click="handleClose"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { BarChart3, Database, FileSpreadsheet, Check, ArrowLeft, Upload } from 'lucide-vue-next'
import { biClient } from '@/core/ai-assistant/bi/js/bi-client.js'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { useToast } from 'vue-toastification'
import { biAnalysisService } from '@/core/bi/js/biAnalysisService.js'
import { biChartsService } from '@/core/bi/js/biChartsService.js'

const toast = useToast()
const router = useRouter()

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const selectedConnection = ref(null)
const selectedFile = ref(null)
const selectedConnectionId = ref(null)
const selectedFileId = ref(null)

const connections = ref([])
const files = ref([])
const loadingConnections = ref(false)
const loadingFiles = ref(false)
const connectionsError = ref(null)
const filesError = ref(null)
const isDragOver = ref(false)
const isUploadingFile = ref(false)
const uploadError = ref(null)
const fileInput = ref(null)

const goToCreateChart = () => {
  if (!selectedFile.value) return
  
  // Закрываем модальное окно BI анализа
  biAnalysisService.close()
  
  // Открываем модальное окно с графиками
  biChartsService.open(selectedFile.value.id)
}

const goToCreateDataset = () => {
  if (!selectedFile.value) return
  
  // Закрываем модальное окно
  biAnalysisService.close()
  
  // Переходим к созданию датасета с параметром файла
  router.push({
    name: 'NewDataset',
    query: {
      file_id: selectedFile.value.id,
      connection_id: selectedConnection.value.id
    }
  })
}

const loadConnections = async () => {
  loadingConnections.value = true
  connectionsError.value = null

  try {
    const result = await biClient.getConnections()
    if (result.success) {
      connections.value = result.connections
    } else {
      connectionsError.value = result.error
    }
  } catch (err) {
    connectionsError.value = 'Ошибка загрузки подключений: ' + err.message
  } finally {
    loadingConnections.value = false
  }
}

const loadFiles = async () => {
  if (!selectedConnection.value) {
    files.value = []
    return
  }

  loadingFiles.value = true
  filesError.value = null

  try {
    const result = await biClient.getConnectionFiles(selectedConnection.value.id)
    if (result.success) {
      files.value = result.files
    } else {
      filesError.value = result.error
    }
  } catch (err) {
    filesError.value = 'Ошибка загрузки файлов: ' + err.message
  } finally {
    loadingFiles.value = false
  }
}

const selectConnection = (connection) => {
  selectedConnection.value = connection
  selectedConnectionId.value = connection.id
  selectedFile.value = null
  selectedFileId.value = null
  loadFiles()
}

const selectFile = (file) => {
  selectedFile.value = file
  selectedFileId.value = file.id
}

const changeConnection = () => {
  selectedConnection.value = null
  selectedConnectionId.value = null
  selectedFile.value = null
  selectedFileId.value = null
  files.value = []
}

const changeFile = () => {
  selectedFile.value = null
  selectedFileId.value = null
}

// Функции для загрузки файлов
const validateFile = (file) => {
  const MAX_SIZE_MB = 200
  const allowedTypes = ['.csv', '.xlsx', '.txt']
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
  
  if (!allowedTypes.includes(fileExtension)) {
    return { valid: false, error: `Неподдерживаемый формат файла. Разрешены: ${allowedTypes.join(', ')}` }
  }
  
  if (file.size === 0) {
    return { valid: false, error: 'Файл пустой' }
  }
  
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `Файл превышает ${MAX_SIZE_MB} МБ` }
  }
  
  return { valid: true }
}

const uploadFileToConnection = async (file) => {
  const validation = validateFile(file)
  if (!validation.valid) {
    uploadError.value = validation.error
    toast.error(validation.error)
    return null
  }

  uploadError.value = null
  isUploadingFile.value = true

  try {
    // Шаг 1: Временная загрузка файла
    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await apiClient.upload(endpoints.bi.Upload, formData, true)
    
    if (!uploadRes.success) {
      throw new Error(uploadRes.error || 'Ошибка загрузки файла')
    }

    // Шаг 2: Финализация файла (привязка к подключению)
    const finalizeFormData = new FormData()
    finalizeFormData.append('temp_path', uploadRes.data.temp_path)
    finalizeFormData.append('name', file.name)
    finalizeFormData.append('original_filename', uploadRes.data.original_filename)
    finalizeFormData.append('file_type', uploadRes.data.file_type)
    finalizeFormData.append('connection', selectedConnection.value.id)

    const finalizeRes = await apiClient.post(endpoints.bi.uploadFinalize, finalizeFormData)
    
    if (!finalizeRes.success) {
      throw new Error(finalizeRes.error || 'Ошибка финализации файла')
    }

    // Обновляем список файлов
    await loadFiles()

    // Автоматически выбираем загруженный файл
    if (finalizeRes.data && finalizeRes.data.id) {
      const uploadedFile = files.value.find(f => f.id === finalizeRes.data.id)
      if (uploadedFile) {
        selectFile(uploadedFile)
        toast.success('Файл успешно загружен')
      }
    }

    return finalizeRes.data
  } catch (error) {
    console.error('Ошибка загрузки файла:', error)
    const errorMessage = error.message || 'Не удалось загрузить файл'
    uploadError.value = errorMessage
    toast.error(errorMessage)
    return null
  } finally {
    isUploadingFile.value = false
  }
}

const handleDrop = async (event) => {
  isDragOver.value = false
  const droppedFiles = Array.from(event.dataTransfer.files)
  
  if (droppedFiles.length === 0) {
    return
  }

  // Берем только первый файл
  const file = droppedFiles[0]
  await uploadFileToConnection(file)
}

const handleFileSelect = async (event) => {
  const selectedFiles = Array.from(event.target.files)
  
  if (selectedFiles.length === 0) {
    return
  }

  // Берем только первый файл
  const file = selectedFiles[0]
  await uploadFileToConnection(file)
  
  // Очищаем input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}


const handleClose = () => {
  emit('close')
  // Сброс состояния при закрытии
  setTimeout(() => {
    selectedConnection.value = null
    selectedFile.value = null
    selectedConnectionId.value = null
    selectedFileId.value = null
    connections.value = []
    files.value = []
  }, 300)
}

// Управление прокруткой страницы
const disableBodyScroll = () => {
  document.body.style.overflow = 'hidden'
}

const enableBodyScroll = () => {
  document.body.style.overflow = ''
}

// Загружаем подключения при открытии модального окна и управляем прокруткой
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    disableBodyScroll()
    loadConnections()
  } else {
    enableBodyScroll()
  }
})

onMounted(() => {
  if (props.show) {
    disableBodyScroll()
    loadConnections()
  }
})

onUnmounted(() => {
  enableBodyScroll()
})
</script>

<style scoped lang="scss">
.bi-analysis-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-dialog {
  z-index: 10000;
  position: relative;
}

.modal-content {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  background-color: var(--bs-body-bg, #ffffff);
  opacity: 1;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #dee2e6;
  background-color: var(--bs-body-bg, #ffffff);
}

.modal-body {
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
  background-color: var(--bs-body-bg, #ffffff);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #dee2e6;
  background-color: var(--bs-body-bg, #ffffff);
}

.step-content {
  min-height: 200px;
}

.selected-connection-info {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: #e7f3ff;
  border-radius: 0.375rem;
  flex-wrap: wrap;
}

.selected-info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #0d6efd;
}

.connection-grid,
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.connection-card,
.file-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.connection-card:hover,
.file-card:hover {
  background-color: #f8f9fa;
  border-color: #dee2e6;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.connection-card--selected,
.file-card--selected {
  background-color: #e7f3ff;
  border-color: #0d6efd;
}

.connection-card__icon,
.file-card__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: #e7f3ff;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0d6efd;
}

.connection-card--selected .connection-card__icon,
.file-card--selected .file-card__icon {
  background: #0d6efd;
  color: white;
}

.connection-card__info,
.file-card__info {
  flex: 1;
  min-width: 0;
}

.connection-card__name,
.file-card__name {
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-card__meta,
.file-card__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.connection-card__check,
.file-card__check {
  flex-shrink: 0;
  color: #0d6efd;
  margin-left: 0.5rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
}

.btn-success.action-button {
  color: white;
}

.drop-zone {
  border: 2px dashed #dee2e6;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
  cursor: pointer;
}

.drop-zone:hover {
  border-color: #0d6efd;
  background-color: #e7f3ff;
}

.drop-zone--active {
  border-color: #0d6efd;
  background-color: #e7f3ff;
  border-style: solid;
  transform: scale(1.02);
}

.drop-zone--uploading {
  border-color: #0d6efd;
  background-color: #e7f3ff;
  cursor: not-allowed;
  opacity: 0.7;
}

.drop-zone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.drop-zone__text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  margin: 0.5rem 0;
}

.drop-zone__link {
  color: #0d6efd;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;
}

.drop-zone__link:hover {
  color: #0a58ca;
}

@media (max-width: 768px) {
  .connection-grid,
  .file-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-body {
    max-height: 60vh;
  }
  
  .drop-zone {
    padding: 1.5rem;
  }
  
  .drop-zone__text {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>

