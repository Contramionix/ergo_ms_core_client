<template>
  <div class="tp-file-uploader">
    <div class="tp-file-uploader__header">
      <h6 class="mb-0">Загрузить документы техпроцессов</h6>
    </div>

    <div class="tp-file-uploader__content">
      <div class="mb-3">
        <label class="form-label">Файлы DOCX</label>
        <div 
          class="file-dropzone" 
          :class="{ 'dragover': isDragging }" 
          role="button"
          tabindex="0"
          @click="triggerFileSelect"
          @keydown.enter.prevent="triggerFileSelect"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            class="d-none"
            accept=".docx"
            multiple
            @change="handleFileSelect"
          />
          <div class="dropzone-content">
            <Upload :size="32" />
            <p class="mb-0 mt-2">
              Перетащите файлы DOCX сюда или
              <button type="button" class="btn-link" @click.stop.prevent="triggerFileSelect">
                выберите файлы
              </button>
            </p>
            <small class="text-muted">Поддерживаемый формат: DOCX. Можно выбрать несколько файлов.</small>
          </div>
        </div>
        <div v-if="selectedFiles.length > 0" class="mt-2">
          <div class="selected-files-list">
            <div 
              v-for="(file, index) in selectedFiles" 
              :key="index"
              class="selected-file"
            >
              <File :size="16" />
              <span>{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <button class="btn-remove" @click="removeFile(index)">
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="btn btn-primary w-100"
        @click.prevent="uploadFiles"
        :disabled="selectedFiles.length === 0 || uploading"
      >
        <span v-if="uploading">
          <span class="spinner-border spinner-border-sm me-2" role="status"></span>
          Загрузка и конвертация ({{ selectedFiles.length }} файлов)...
        </span>
        <span v-else>
          <Upload :size="16" class="me-1" />
          Загрузить {{ selectedFiles.length > 0 ? `(${selectedFiles.length})` : '' }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Upload, File, X } from 'lucide-vue-next'
import { tpClient } from './js/tp-client.js'

const props = defineProps({
  sessionId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['document-uploaded', 'document-created'])

const fileInput = ref(null)
const selectedFiles = ref([])
const isDragging = ref(false)
const uploading = ref(false)

const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length > 0) {
    validateAndAddFiles(files)
  }
}

const handleDrop = (event) => {
  isDragging.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length > 0) {
    validateAndAddFiles(files)
  }
}

const validateAndAddFiles = (files) => {
  const validTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  const validExtensions = ['.docx']
  const maxSize = 50 * 1024 * 1024 // 50 МБ
  
  const errors = []
  const validFiles = []
  
  files.forEach(file => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    // Проверяем тип файла
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      errors.push(`"${file.name}" - неподдерживаемый тип файла`)
      return
    }
    
    // Проверяем размер
    if (file.size > maxSize) {
      errors.push(`"${file.name}" - файл слишком большой (максимум ${formatFileSize(maxSize)})`)
      return
    }
    
    // Проверяем, не добавлен ли уже такой файл
    if (selectedFiles.value.some(f => f.name === file.name && f.size === file.size)) {
      errors.push(`"${file.name}" - файл уже добавлен`)
      return
    }
    
    validFiles.push(file)
  })
  
  if (validFiles.length > 0) {
    selectedFiles.value.push(...validFiles)
  }
}

const removeFile = (index) => {
  if (index >= 0 && index < selectedFiles.value.length) {
    selectedFiles.value.splice(index, 1)
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) {
    return
  }
  
  if (!props.sessionId) {
    return
  }
  
  uploading.value = true
  
  try {
    const result = await tpClient.uploadDocuments(selectedFiles.value, props.sessionId)
    
    if (result.success) {
      const count = result.documents?.length || 0
      if (count > 0) {
        emit('document-uploaded', result.documents)
        emit('document-created', result.documents)
      }
      
      selectedFiles.value = []
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки документов:', error)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.tp-file-uploader {
  padding: 1rem;
}

.tp-file-uploader__header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--bs-border-color);
}

.tp-file-uploader__content {
  /* Стили наследуются от родительского компонента */
}

.file-dropzone {
  border: 2px dashed var(--bs-border-color);
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}

.file-dropzone:hover {
  border-color: var(--bs-primary);
  background-color: rgba(var(--bs-primary-rgb), 0.05);
}

.file-dropzone.dragover {
  border-color: var(--bs-primary);
  background-color: rgba(var(--bs-primary-rgb), 0.1);
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--bs-secondary);
}

.btn-link {
  background: none;
  border: none;
  color: var(--bs-primary);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  color: var(--bs-primary);
  text-decoration: none;
}

.selected-files-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: var(--bs-light);
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.file-size {
  margin-left: auto;
  color: var(--bs-secondary);
  font-size: 0.75rem;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--bs-danger);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  color: var(--bs-danger);
  background-color: rgba(var(--bs-danger-rgb), 0.1);
  border-radius: 0.25rem;
}
</style>
