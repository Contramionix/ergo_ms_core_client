<template>
  <div 
    v-if="show" 
    class="bi-analysis-modal fade show d-block" 
    tabindex="-1"
    @drop.prevent="handleGlobalDrop"
    @dragover.prevent="handleGlobalDragOver"
  >
    <div 
      ref="modalDialogRef"
      class="modal-dialog modal-dialog-centered modal-lg"
      :style="modalStyle"
    >
      <div class="modal-content" :style="contentStyle">
        <div 
          class="modal-header"
          @mousedown="startDrag"
          style="cursor: move;"
        >
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
              <button class="btn btn-sm btn-danger text-white" @click="changeConnection">
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
              @dragover.prevent="handleDragOver"
              @dragenter.prevent="handleDragEnter"
              @dragleave.prevent="handleDragLeave"
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
              <button class="btn btn-sm btn-danger text-white" @click="changeFile">
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
        
        <!-- Handles для изменения размера -->
        <!-- Углы -->
        <div 
          class="resize-handle resize-handle-nw"
          @mousedown="(e) => startResize(e, 'nw')"
          title="Изменить размер"
        ></div>
        <div 
          class="resize-handle resize-handle-ne"
          @mousedown="(e) => startResize(e, 'ne')"
          title="Изменить размер"
        ></div>
        <div 
          class="resize-handle resize-handle-sw"
          @mousedown="(e) => startResize(e, 'sw')"
          title="Изменить размер"
        ></div>
        <div 
          class="resize-handle resize-handle-se"
          @mousedown="(e) => startResize(e, 'se')"
          title="Изменить размер"
        ></div>
        <!-- Края -->
        <div 
          class="resize-handle resize-handle-n"
          @mousedown="(e) => startResize(e, 'n')"
          title="Изменить высоту"
        ></div>
        <div 
          class="resize-handle resize-handle-s"
          @mousedown="(e) => startResize(e, 's')"
          title="Изменить высоту"
        ></div>
        <div 
          class="resize-handle resize-handle-w"
          @mousedown="(e) => startResize(e, 'w')"
          title="Изменить ширину"
        ></div>
        <div 
          class="resize-handle resize-handle-e"
          @mousedown="(e) => startResize(e, 'e')"
          title="Изменить ширину"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
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

// Состояние для перетаскивания модального окна
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const modalPosition = ref({ x: null, y: null })
const modalDialogRef = ref(null)

// Состояние для изменения размера
const isResizing = ref(false)
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 })
const resizeDirection = ref('') // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
const modalSize = ref({ width: null, height: null })

// Вычисляем стили для модального окна
const modalStyle = computed(() => {
  const style = {}
  
  if (modalPosition.value.x !== null && modalPosition.value.y !== null) {
    style.position = 'fixed'
    style.top = `${modalPosition.value.y}px`
    style.left = `${modalPosition.value.x}px`
    style.margin = '0'
    style.transform = 'none'
  }
  
  if (modalSize.value.width !== null) {
    style.width = `${modalSize.value.width}px`
    style.maxWidth = 'none'
  }
  
  if (modalSize.value.height !== null) {
    style.height = `${modalSize.value.height}px`
    style.maxHeight = 'none'
  }
  
  return style
})

// Стили для содержимого модального окна
const contentStyle = computed(() => {
  if (modalSize.value.height !== null) {
    return {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }
  return {}
})

const goToCreateChart = () => {
  if (!selectedFile.value) return
  
  // Сохраняем состояние перед переходом к графику
  saveState()
  
  // Закрываем модальное окно BI анализа
  biAnalysisService.close()
  
  // Открываем модальное окно с графиками
  biChartsService.open(selectedFile.value.id)
}

const goToCreateDataset = () => {
  if (!selectedFile.value) return
  
  // Очищаем состояние при переходе к датасету
  clearState()
  
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
  saveState()
}

const selectFile = (file) => {
  selectedFile.value = file
  selectedFileId.value = file.id
  saveState()
}

const changeConnection = () => {
  selectedConnection.value = null
  selectedConnectionId.value = null
  selectedFile.value = null
  selectedFileId.value = null
  files.value = []
  saveState()
}

const changeFile = () => {
  selectedFile.value = null
  selectedFileId.value = null
  saveState()
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

// Обработчики drag & drop для drop-zone
const handleDragOver = (e) => {
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    isDragOver.value = true
  }
}

const handleDragEnter = (e) => {
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault()
    isDragOver.value = true
  }
}

const handleDragLeave = (e) => {
  // Проверяем, что мы действительно покинули drop-zone
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragOver.value = false
  }
}

const handleDrop = async (event) => {
  isDragOver.value = false
  
  if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) {
    return
  }
  
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


// Сохранение состояния в localStorage
const saveState = () => {
  const state = {
    connectionId: selectedConnectionId.value,
    fileId: selectedFileId.value
  }
  localStorage.setItem('biAnalysisModalState', JSON.stringify(state))
}

// Восстановление состояния из localStorage
const restoreState = async () => {
  try {
    const savedState = localStorage.getItem('biAnalysisModalState')
    if (!savedState) return
    
    const state = JSON.parse(savedState)
    
    if (state.connectionId) {
      // Восстанавливаем подключение
      await loadConnections()
      const connection = connections.value.find(c => c.id === state.connectionId)
      if (connection) {
        selectedConnection.value = connection
        selectedConnectionId.value = connection.id
        await loadFiles()
        
        // Восстанавливаем файл, если был выбран
        if (state.fileId) {
          const file = files.value.find(f => f.id === state.fileId)
          if (file) {
            selectedFile.value = file
            selectedFileId.value = file.id
          }
        }
      }
    }
  } catch (error) {
    console.error('Ошибка восстановления состояния:', error)
  }
}

// Очистка сохраненного состояния
const clearState = () => {
  localStorage.removeItem('biAnalysisModalState')
}

const handleClose = () => {
  // Сохраняем состояние перед закрытием
  saveState()
  emit('close')
}

// Функции для перетаскивания модального окна
const startDrag = (e) => {
  // Не начинаем перетаскивание, если клик по кнопке закрытия
  if (e.target.closest('.btn-close')) {
    return
  }
  
  if (!modalDialogRef.value) return
  
  // Получаем текущую позицию модального окна
  const rect = modalDialogRef.value.getBoundingClientRect()
  
  // Если позиция еще не установлена, устанавливаем начальную
  if (modalPosition.value.x === null || modalPosition.value.y === null) {
    modalPosition.value = {
      x: rect.left,
      y: rect.top
    }
  }
  
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - modalPosition.value.x,
    y: e.clientY - modalPosition.value.y
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  modalPosition.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Функции для изменения размера модального окна
const startResize = (e, direction) => {
  if (!modalDialogRef.value) return
  
  isResizing.value = true
  resizeDirection.value = direction
  const rect = modalDialogRef.value.getBoundingClientRect()
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top
  }
  
  // Если размер еще не установлен, устанавливаем текущий
  if (modalSize.value.width === null) {
    modalSize.value.width = rect.width
  }
  if (modalSize.value.height === null) {
    modalSize.value.height = rect.height
  }
  
  // Если позиция еще не установлена, устанавливаем начальную
  if (modalPosition.value.x === null || modalPosition.value.y === null) {
    modalPosition.value = {
      x: rect.left,
      y: rect.top
    }
  }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
  e.stopPropagation()
}

const onResize = (e) => {
  if (!isResizing.value) return
  
  const deltaX = e.clientX - resizeStart.value.x
  const deltaY = e.clientY - resizeStart.value.y
  const direction = resizeDirection.value
  
  let newWidth = resizeStart.value.width
  let newHeight = resizeStart.value.height
  let newLeft = modalPosition.value.x
  let newTop = modalPosition.value.y
  
  // Изменение ширины
  if (direction.includes('e')) {
    // Правый край
    newWidth = resizeStart.value.width + deltaX
  } else if (direction.includes('w')) {
    // Левый край
    newWidth = resizeStart.value.width - deltaX
    newLeft = resizeStart.value.left + deltaX
  }
  
  // Изменение высоты
  if (direction.includes('s')) {
    // Нижний край
    newHeight = resizeStart.value.height + deltaY
  } else if (direction.includes('n')) {
    // Верхний край
    newHeight = resizeStart.value.height - deltaY
    newTop = resizeStart.value.top + deltaY
  }
  
  // Минимальные размеры
  const minWidth = 400
  const minHeight = 300
  
  // Корректируем позицию и размер при изменении левого/верхнего края
  if (direction.includes('w')) {
    if (newWidth < minWidth) {
      newWidth = minWidth
      newLeft = resizeStart.value.left + (resizeStart.value.width - minWidth)
    }
  }
  
  if (direction.includes('n')) {
    if (newHeight < minHeight) {
      newHeight = minHeight
      newTop = resizeStart.value.top + (resizeStart.value.height - minHeight)
    }
  }
  
  modalSize.value = {
    width: Math.max(minWidth, newWidth),
    height: Math.max(minHeight, newHeight)
  }
  
  if (direction.includes('w') || direction.includes('n')) {
    modalPosition.value = {
      x: newLeft,
      y: newTop
    }
  }
  
  // Сохраняем размер
  saveSize()
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// Сохранение и загрузка размера
const saveSize = () => {
  localStorage.setItem('biAnalysisModalSize', JSON.stringify(modalSize.value))
}

const loadSize = () => {
  try {
    const savedSize = localStorage.getItem('biAnalysisModalSize')
    if (savedSize) {
      const size = JSON.parse(savedSize)
      if (size.width && size.height) {
        modalSize.value = {
          width: size.width,
          height: size.height
        }
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки размера:', error)
  }
}

// Обработка глобального dragover (разрешаем перетаскивание файлов)
const handleGlobalDragOver = (e) => {
  // Разрешаем drop только если это файлы
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
}

// Обработка глобального drop (если файл перетащили на фон модального окна или в drop-zone)
const handleGlobalDrop = (e) => {
  // Проверяем, что это файлы
  if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
    return
  }
  
  // Если drop произошел на drop-zone, обработка будет выполнена в handleDrop
  if (e.target.closest('.drop-zone')) {
    return
  }
  
  // Если drop произошел на фон, но у нас выбрано подключение, загружаем файл
  if (selectedConnection.value) {
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0]
      uploadFileToConnection(file)
    }
  }
}

// Загружаем подключения при открытии модального окна
watch(() => props.show, async (isOpen) => {
  if (isOpen) {
    // Сбрасываем позицию при открытии (будет центрировано)
    modalPosition.value = { x: null, y: null }
    // Загружаем размер при открытии
    loadSize()
    // Загружаем подключения и восстанавливаем состояние
    await loadConnections()
    await restoreState()
  } else {
    // Сбрасываем позицию при закрытии
    modalPosition.value = { x: null, y: null }
    stopDrag()
    stopResize()
  }
})

onMounted(() => {
  if (props.show) {
    loadConnections()
  }
})

onUnmounted(() => {
  stopDrag()
})
</script>

<style scoped lang="scss">
.bi-analysis-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
  z-index: 9999;
  pointer-events: none; // Фон не блокирует взаимодействие
  overflow: visible;
}

.modal-dialog {
  z-index: 10000;
  position: relative;
  pointer-events: auto;
  max-width: 800px;
  width: 100%;
  
  &[style*="position: fixed"] {
    margin: 0;
  }
}

.modal-content {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  background-color: var(--bs-body-bg, #ffffff);
  opacity: 1;
  position: relative;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  z-index: 10;
  background-color: transparent;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(var(--bs-primary-rgb, 13, 110, 253), 0.2);
  }
  
  // Углы
  &-nw {
    top: 0;
    left: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
  }
  
  &-ne {
    top: 0;
    right: 0;
    width: 20px;
    height: 20px;
    cursor: nesw-resize;
  }
  
  &-sw {
    bottom: 0;
    left: 0;
    width: 20px;
    height: 20px;
    cursor: nesw-resize;
  }
  
  &-se {
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
  }
  
  // Края
  &-n {
    top: 0;
    left: 20px;
    right: 20px;
    height: 10px;
    cursor: ns-resize;
  }
  
  &-s {
    bottom: 0;
    left: 20px;
    right: 20px;
    height: 10px;
    cursor: ns-resize;
  }
  
  &-w {
    left: 0;
    top: 20px;
    bottom: 20px;
    width: 10px;
    cursor: ew-resize;
  }
  
  &-e {
    right: 0;
    top: 20px;
    bottom: 20px;
    width: 10px;
    cursor: ew-resize;
  }
  
  &:hover {
    background: linear-gradient(
      -45deg,
      transparent 0%,
      transparent 30%,
      var(--bs-primary, #0d6efd) 30%,
      var(--bs-primary, #0d6efd) 35%,
      transparent 35%,
      transparent 65%,
      var(--bs-primary, #0d6efd) 65%,
      var(--bs-primary, #0d6efd) 70%,
      transparent 70%
    );
  }
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #dee2e6;
  background-color: var(--bs-body-bg, #ffffff);
  user-select: none;
  
  &:active {
    cursor: grabbing;
  }
}

.modal-body {
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--bs-body-bg, #ffffff);
  flex: 1;
  min-height: 0;
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

