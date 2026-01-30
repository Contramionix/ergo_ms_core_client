<template>
  <div 
    v-if="isVisible" 
    class="tp-assistant-chat tp-assistant-chat--visible"
    :class="{ 'drag-over': isDragging }"
    :style="{ '--module-color': moduleColor }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div v-if="!hideHeader" class="tp-assistant-chat__header">
      <div class="tp-assistant-chat__title">
        <Wrench :size="20" class="me-2" />
        <span>AI Ассистент - Техпроцессы</span>
      </div>
      <div class="tp-assistant-chat__controls">
        <button 
          class="control-btn btn-primary" 
          @click="handleOpenUploader"
          title="Загрузить документ"
        >
          <Upload :size="18" />
          <span class="ms-1">Загрузить</span>
        </button>
      </div>
    </div>
    
    <!-- Модальное окно загрузки документов -->
    <teleport to="body">
      <div v-if="showUploader" class="upload-modal-overlay" @click.self="showUploader = false">
        <div class="upload-modal">
          <div class="upload-modal__header">
            <div class="upload-modal__title">
              <Upload :size="24" class="me-2" />
              <h5 class="mb-0">Загрузка документа техпроцесса</h5>
            </div>
            <button class="upload-modal__close" @click="showUploader = false" title="Закрыть">
              <X :size="20" />
            </button>
          </div>
          <div class="upload-modal__body">
            <TPFileUploader
              :session-id="currentSessionId"
              @document-uploaded="handleDocumentUploaded"
            />
          </div>
        </div>
      </div>
    </teleport>

    <!-- Модальное окно просмотра документа -->
    <teleport to="body">
      <div v-if="previewDocumentId" class="upload-modal-overlay" @click.self="closeDocumentPreview">
        <div class="document-preview-modal">
          <div class="document-preview-modal__header">
            <h5 class="mb-0 document-preview-modal__title">{{ previewDocument?.title || 'Загрузка...' }}</h5>
            <button class="upload-modal__close" @click="closeDocumentPreview" title="Закрыть">
              <X :size="20" />
            </button>
          </div>
          <div class="document-preview-modal__body">
            <div v-if="previewLoading" class="document-preview-loading">
              <span class="spinner-border spinner-border-sm me-2" role="status"></span>
              Загрузка документа...
            </div>
            <div
              v-else-if="previewDocument?.markdown_content"
              class="document-preview-content"
              v-html="formatPreviewMarkdown(previewDocument.markdown_content)"
            ></div>
            <div v-else class="document-preview-empty">Документ пуст или не удалось загрузить</div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Список загруженных документов -->
    <div v-if="documents.length > 0" class="tp-assistant-chat__documents-list" :class="{ 'tp-assistant-chat__documents-list--collapsed': !documentsExpanded }">
      <div class="documents-header" @click="documentsExpanded = !documentsExpanded">
        <h6 class="mb-0 documents-header__title">
          <component :is="documentsExpanded ? ChevronUp : ChevronDown" :size="16" class="documents-header__chevron" :title="documentsExpanded ? 'Свернуть' : 'Развернуть'" />
          Загруженные документы ({{ documents.length }})
        </h6>
      </div>
      <div class="documents-grid-wrapper">
        <div class="documents-grid">
        <div 
          v-for="doc in documents" 
          :key="doc.id"
          class="document-card document-card--clickable"
          @click="openDocumentPreview(doc.id)"
        >
          <div class="document-card__icon">
            <FileText :size="20" />
          </div>
          <div class="document-card__info">
            <div class="document-card__title">{{ doc.title }}</div>
            <div class="document-card__meta">
              {{ doc.file_name || 'Без имени файла' }}
            </div>
          </div>
          <button 
            class="document-card__delete"
            @click.stop="deleteDocument(doc.id)"
            title="Удалить"
          >
            <X :size="16" />
          </button>
        </div>
      </div>
      </div>
    </div>

    <!-- Сообщения -->
    <div v-if="showMessages || messages.length > 1" ref="messagesContainer" class="tp-assistant-chat__messages">
      <AssistantMessage 
        v-for="message in messages" 
        :key="message.id" 
        :message="message"
        :class="{ 'streaming': message.isStreaming }"
      />
      <AssistantTyping v-if="isTyping && !hasStreamingContent" />
    </div>

    <!-- Ввод -->
    <div class="tp-assistant-chat__input">
      <div class="input-wrapper">
        <div class="input-group">
          <input
            v-model="inputMessage"
            type="text"
            class="form-control"
            placeholder="Задайте вопрос по техпроцессам..."
            @keypress.enter="sendMessage"
            :disabled="isTyping"
          />
          <button
            class="btn btn-primary"
            @click="sendMessage"
            :disabled="!inputMessage.trim() || isTyping"
          >
            <Send :size="18" />
          </button>
        </div>
        <div v-if="documents.length > 0" class="documents-info mt-2">
          <small class="text-muted">
            Используются все загруженные документы ({{ documents.length }})
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed, onMounted } from 'vue'
import { Send, Wrench, Upload, X, FileText, ChevronDown, ChevronUp } from 'lucide-vue-next'
import AssistantMessage from '../base/AssistantMessage.vue'
import AssistantTyping from '../base/AssistantTyping.vue'
import TPFileUploader from './TPFileUploader.vue'
import { tpClient } from './js/tp-client.js'
import { formatMarkdown } from './js/markdown-utils.js'
import { ragClient } from '../rag/js/rag-client.js'
import { getModuleById } from '../modules/index.js'
import { useToast } from 'vue-toastification'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
  hideHeader: {
    type: Boolean,
    default: false,
  },
  forceShowUploader: {
    type: Boolean,
    default: false,
  },
  sessionId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['session-updated', 'uploader-opened', 'uploader-closed'])

const toast = useToast()

// Метод для сброса чата
const resetChat = async () => {
  // Если есть sessionId из prop, используем его
  if (props.sessionId) {
    currentSessionId = props.sessionId
  } else {
    // Иначе создаем новую сессию
    currentSessionId = null
    await ensureSession()
  }
  
  historyLoaded = false
  
  messageIdCounter = 1
  messages.value = [{
    id: messageIdCounter++,
    type: 'assistant',
    content: 'Привет! Я ваш AI ассистент для работы с техпроцессами.\n\n**Что я умею:**\n• Отвечать на вопросы на основе загруженных документов техпроцессов\n• Искать информацию в документах\n• Анализировать таблицы и извлекать данные\n\n**Начните работу:**\n1. Нажмите кнопку "Загрузить" для добавления документов DOCX\n2. После загрузки документы автоматически конвертируются в Markdown\n3. Затем задавайте вопросы к документам!',
    timestamp: new Date(),
  }]
  
  showMessages.value = false
  inputMessage.value = ''
  isTyping.value = false
  streamingMessageId = null
  showUploader.value = false
  
  // Загружаем документы для текущей сессии
  await loadDocuments()
  
  nextTick(() => {
    scrollToBottom()
  })
}

const messagesContainer = ref(null)
const inputMessage = ref('')
const isTyping = ref(false)
const showMessages = ref(false)
const showUploader = ref(false)

// Обработчик открытия модального окна загрузки
const handleOpenUploader = async () => {
  // Если есть sessionId из prop, используем его
  if (props.sessionId && !currentSessionId) {
    currentSessionId = props.sessionId
  }
  
  // Убеждаемся, что сессия создана перед открытием окна загрузки
  if (!currentSessionId) {
    const sessionReady = await ensureSession()
    if (!sessionReady) {
      return
    }
  }
  showUploader.value = true
}
const isDragging = ref(false)
const documents = ref([])
const documentsExpanded = ref(true)
const previewDocumentId = ref(null)
const previewDocument = ref(null)
const previewLoading = ref(false)

const formatPreviewMarkdown = (content) => formatMarkdown(content || '')

const openDocumentPreview = async (documentId) => {
  previewDocumentId.value = documentId
  previewDocument.value = null
  previewLoading.value = true
  try {
    const result = await tpClient.getDocument(documentId)
    if (result.success) {
      previewDocument.value = result.document
    }
  } finally {
    previewLoading.value = false
  }
}

const closeDocumentPreview = () => {
  previewDocumentId.value = null
  previewDocument.value = null
}

let messageIdCounter = 1
let streamingMessageId = null
let currentSessionId = null
let historyLoaded = false

const messages = ref([
  {
    id: messageIdCounter++,
    type: 'assistant',
    content: 'Привет! Я ваш AI ассистент для работы с техпроцессами.\n\n**Что я умею:**\n• Отвечать на вопросы на основе загруженных документов техпроцессов\n• Искать информацию в документах\n• Анализировать таблицы и извлекать данные\n\n**Начните работу:**\n1. Нажмите кнопку "Загрузить" для добавления документов DOCX\n2. После загрузки документы автоматически конвертируются в Markdown\n3. Затем задавайте вопросы к документам!',
    timestamp: new Date(),
  },
])

const hasStreamingContent = computed(() => {
  return messages.value.some(m => m.isStreaming)
})

const moduleColor = computed(() => {
  const module = getModuleById('tp')
  return module?.color || '#f59e0b'
})

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const loadDocuments = async () => {
  // Загружаем документы только если есть активная сессия
  if (!currentSessionId) {
    documents.value = []
    return
  }
  
  const result = await tpClient.getDocuments(currentSessionId)
  if (result.success) {
    documents.value = result.documents || []
  } else {
    console.error('Ошибка загрузки документов:', result.error)
    documents.value = []
  }
}

// Создание сессии при первой загрузке документов или отправке сообщения
const ensureSession = async () => {
  if (!currentSessionId) {
    try {
      // Создаем новую сессию через ragClient
      const sessionResult = await ragClient.createChatSession('Новый чат техпроцессов', 'tp')
      if (sessionResult.success && sessionResult.session) {
        currentSessionId = sessionResult.session.id
        emit('session-updated', currentSessionId)
        return true
      } else {
        console.error('Не удалось создать сессию:', sessionResult.error)
        toast.error('Не удалось создать сессию чата. Попробуйте еще раз.')
        return false
      }
    } catch (error) {
      console.error('Ошибка создания сессии:', error)
      toast.error('Ошибка создания сессии чата. Попробуйте еще раз.')
      return false
    }
  }
  return true
}

const handleDocumentUploaded = async (document) => {
  showUploader.value = false
  showMessages.value = true
  
  // Если есть sessionId из prop, используем его
  if (props.sessionId && !currentSessionId) {
    currentSessionId = props.sessionId
  }
  
  // Если сессии нет, создаем новую
  if (!currentSessionId) {
    const sessionReady = await ensureSession()
    if (!sessionReady) {
      return
    }
  }
  
  // Загружаем документы для текущей сессии
  await loadDocuments()
  
  // Обрабатываем как одиночный документ, так и массив
  if (Array.isArray(document)) {
    const count = document.length
    if (count > 0) {
      // Формируем таблицу с загруженными документами
      let tableContent = '✅ Успешно загружено документов: ' + count + '\n\n'
      tableContent += '| № | Название документа |\n'
      tableContent += '| --- | --- |\n'
      document.forEach((doc, index) => {
        tableContent += `| ${index + 1} | ${doc.title} |\n`
      })
      tableContent += '\nВсе документы будут использоваться при ответах на ваши вопросы.'
      addAssistantMessage(tableContent)
    }
  } else {
    // Для одиночного документа тоже используем таблицу
    let tableContent = '✅ Документ успешно загружен и сконвертирован в Markdown.\n'
    tableContent += '| Название документа |\n'
    tableContent += '| --- |\n'
    tableContent += `| ${document.title} |\n`
    tableContent += '\nДокумент будет использоваться при ответах на ваши вопросы.'
    addAssistantMessage(tableContent)
  }
}

const addAssistantMessage = (content) => {
  const message = {
    id: messageIdCounter++,
    type: 'assistant',
    content: content,
    timestamp: new Date(),
  }
  messages.value.push(message)
  scrollToBottom()
}

const deleteDocument = async (documentId) => {
  if (!confirm('Удалить этот документ?')) {
    return
  }
  
  const result = await tpClient.deleteDocument(documentId)
  if (result.success) {
    toast.success('Документ удален')
    await loadDocuments()
  } else {
    toast.error(result.error || 'Не удалось удалить документ')
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value) {
    return
  }

  // Если есть sessionId из prop, используем его
  if (props.sessionId && !currentSessionId) {
    currentSessionId = props.sessionId
  }
  
  // Убеждаемся, что сессия создана перед отправкой сообщения
  if (!currentSessionId) {
    const sessionReady = await ensureSession()
    if (!sessionReady) {
      toast.error('Не удалось создать сессию чата. Попробуйте еще раз.')
      return
    }
  }

  if (!showMessages.value) {
    showMessages.value = true
  }

  const messageText = inputMessage.value.trim()
  
  const userMessage = {
    id: messageIdCounter++,
    type: 'user',
    content: messageText,
    timestamp: new Date(),
  }
  messages.value.push(userMessage)
  inputMessage.value = ''
  scrollToBottom()

  isTyping.value = true

  // Если есть sessionId из prop, используем его
  if (props.sessionId && !currentSessionId) {
    currentSessionId = props.sessionId
  }
  
  // Убеждаемся, что сессия существует
  if (!currentSessionId) {
    const sessionReady = await ensureSession()
    if (!sessionReady) {
      isTyping.value = false
      toast.error('Не удалось создать сессию чата. Попробуйте еще раз.')
      return
    }
  }

  // Получаем настройки Ollama из конфига модуля
  const module = getModuleById('tp')
  const ollamaConfig = module?.ollama_config || {}
  tpClient.setOllamaConfig(ollamaConfig)

  // Создаем сообщение для streaming
  streamingMessageId = messageIdCounter++
  const streamingMessage = {
    id: streamingMessageId,
    type: 'assistant',
    content: '',
    timestamp: new Date(),
    isStreaming: true,
  }
  messages.value.push(streamingMessage)
  scrollToBottom()

  try {
    await tpClient.sendMessageStream(
      messageText,
      // onChunk
      (chunk) => {
        console.log('[TP Chat] Получен chunk (длина:', chunk?.length || 0, '):', chunk?.substring(0, 100))
        const msg = messages.value.find(m => m.id === streamingMessageId)
        if (msg) {
          // Принудительно обновляем контент для реактивности Vue
          msg.content = (msg.content || '') + (chunk || '')
          // Принудительно триггерим обновление через nextTick
          nextTick(() => {
            scrollToBottom()
          })
        } else {
          console.warn('[TP Chat] Сообщение для streaming не найдено, ID:', streamingMessageId)
        }
      },
      // onDone
      async (fullResponse, metadata) => {
        console.log('[TP Chat] ========== ПОЛНЫЙ ОТВЕТ ПОЛУЧЕН ==========')
        console.log('[TP Chat] Длина ответа:', fullResponse?.length || 0)
        console.log('[TP Chat] Полный текст ответа:')
        console.log(fullResponse)
        console.log('[TP Chat] ==========================================')
        console.log('[TP Chat] Metadata:', metadata)
        
        const msg = messages.value.find(m => m.id === streamingMessageId)
        if (msg) {
          // Устанавливаем полный ответ и отключаем streaming
          msg.content = fullResponse || ''
          msg.isStreaming = false
          console.log('[TP Chat] Сообщение обновлено, контент установлен (длина:', msg.content.length, ')')
        } else {
          console.error('[TP Chat] Сообщение для streaming не найдено при завершении, ID:', streamingMessageId)
        }
        isTyping.value = false
        streamingMessageId = null
        
        if (metadata?.session_id) {
          currentSessionId = metadata.session_id
          emit('session-updated', metadata.session_id)
        }
        
        await nextTick()
        scrollToBottom()
      },
      // onError
      (errorMsg) => {
        const msg = messages.value.find(m => m.id === streamingMessageId)
        if (msg) {
          msg.content = `**Ошибка:** ${errorMsg}`
          msg.isStreaming = false
        }
        isTyping.value = false
        streamingMessageId = null
        scrollToBottom()
      },
      currentSessionId
    )
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error)
    const msg = messages.value.find(m => m.id === streamingMessageId)
    if (msg) {
      msg.content = `**Ошибка:** ${error.message || 'Не удалось отправить сообщение'}`
      msg.isStreaming = false
    }
    isTyping.value = false
    streamingMessageId = null
    scrollToBottom()
  }
}

const handleDragOver = (event) => {
  isDragging.value = true
  event.dataTransfer.dropEffect = 'copy'
}

const handleDragLeave = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragging.value = false
  }
}

const handleDrop = async (event) => {
  isDragging.value = false
  
  const files = Array.from(event.dataTransfer.files)
  const docxFiles = files.filter(file => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return ext === 'docx'
  })
  
  if (docxFiles.length === 0) {
    addAssistantMessage(
      '⚠️ **Ошибка:** Поддерживаются только файлы формата DOCX.'
    )
    return
  }
  
  // Если есть sessionId из prop, используем его
  if (props.sessionId && !currentSessionId) {
    currentSessionId = props.sessionId
  }
  
  // Убеждаемся, что сессия создана перед открытием окна загрузки
  if (!currentSessionId) {
    const sessionReady = await ensureSession()
    if (!sessionReady) {
      return
    }
  }
  showUploader.value = true
}

watch(() => props.forceShowUploader, async (newVal) => {
  if (newVal) {
    if (props.sessionId && !currentSessionId) {
      currentSessionId = props.sessionId
    }
    if (!currentSessionId) {
      const sessionReady = await ensureSession()
      if (!sessionReady) {
        emit('uploader-closed')
        return
      }
    }
    showUploader.value = true
    emit('uploader-opened')
  } else {
    showUploader.value = false
  }
})

watch(showUploader, (isOpen) => {
  if (!isOpen) {
    emit('uploader-closed')
  }
})

const loadSession = async (sessionId) => {
  if (!sessionId) return
  
  currentSessionId = sessionId
  historyLoaded = false
  
  try {
    await loadDocuments()
    
    const sessionResult = await tpClient.getChatSession(sessionId)
    if (sessionResult.success) {
      if (sessionResult.messages && sessionResult.messages.length > 0) {
        const historyMessages = sessionResult.messages.map(msg => ({
          id: messageIdCounter++,
          type: msg.type,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          processing_time_ms: msg.processing_time_ms,
        }))
        messages.value = historyMessages
        showMessages.value = true
      } else {
        messages.value = [{
          id: messageIdCounter++,
          type: 'assistant',
          content: 'Привет! Я ваш AI ассистент для работы с техпроцессами.\n\n**Что я умею:**\n• Отвечать на вопросы на основе загруженных документов техпроцессов\n• Искать информацию в документах\n• Анализировать таблицы и извлекать данные\n\n**Начните работу:**\n1. Нажмите кнопку "Загрузить" для добавления документов DOCX\n2. После загрузки документы автоматически конвертируются в Markdown\n3. Затем задавайте вопросы к документам!',
          timestamp: new Date(),
        }]
        showMessages.value = false
      }
    }
    historyLoaded = true
    scrollToBottom()
  } catch (error) {
    console.error('Ошибка загрузки сессии:', error)
    historyLoaded = true
  }
}

const loadLatestSession = async () => {
  if (props.sessionId) {
    await loadSession(props.sessionId)
    return
  }
  
  try {
    const sessionsResult = await tpClient.getChatSessions()
    if (sessionsResult.success && sessionsResult.sessions && sessionsResult.sessions.length > 0) {
      const latestSession = sessionsResult.sessions.sort((a, b) =>
        new Date(b.updated_at) - new Date(a.updated_at)
      )[0]
      await loadSession(latestSession.id)
    }
  } catch (error) {
    console.error('Ошибка загрузки последней сессии:', error)
  }
}

watch(() => props.sessionId, async (newSessionId, oldSessionId) => {
  if (newSessionId) {
    if (newSessionId !== currentSessionId) {
      await loadSession(newSessionId)
    }
  } else if (oldSessionId) {
    currentSessionId = null
    documents.value = []
    historyLoaded = false
  }
}, { immediate: true })

watch(() => props.isVisible, (newVal) => {
  if (newVal && props.sessionId && !historyLoaded) {
    loadSession(props.sessionId)
  } else if (newVal) {
    scrollToBottom()
  }
})

onMounted(() => {
  if (props.sessionId) {
    loadSession(props.sessionId)
  } else if (props.isVisible) {
    loadLatestSession()
  } else {
    scrollToBottom()
  }
})

defineExpose({
  resetChat,
  loadSession
})
</script>

<style scoped>
.tp-assistant-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: 
    radial-gradient(ellipse at top, color-mix(in srgb, var(--module-color, #f59e0b) 8%, transparent) 0%, transparent 50%),
    radial-gradient(ellipse at bottom, color-mix(in srgb, var(--module-color, #f59e0b) 5%, transparent) 0%, transparent 50%);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.tp-assistant-chat.drag-over::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--module-color, #f59e0b) 10%, transparent);
  border: 2px dashed var(--module-color, #f59e0b);
  border-radius: 0.5rem;
  z-index: 100;
  pointer-events: none;
}

.tp-assistant-chat__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--bs-border-color);
}

.tp-assistant-chat__title {
  display: flex;
  align-items: center;
  font-weight: 600;
}

.tp-assistant-chat__controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  color: var(--bs-secondary);
  text-decoration: none;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.control-btn:hover {
  color: var(--module-color, #f59e0b);
  background-color: color-mix(in srgb, var(--module-color, #f59e0b) 10%, transparent);
}

.control-btn.btn-primary {
  background-color: var(--module-color, #f59e0b);
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  border: none;
  cursor: pointer;
}

.control-btn.btn-primary:hover {
  opacity: 0.9;
  color: white;
}

.upload-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.upload-modal {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--bs-body-bg) 95%, transparent) 0%,
    color-mix(in srgb, var(--module-color, #f59e0b) 15%, var(--bs-body-bg)) 100%
  );
  backdrop-filter: blur(20px);
  border-radius: 1rem;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px color-mix(in srgb, var(--module-color, #f59e0b) 30%, transparent),
    0 0 40px color-mix(in srgb, var(--module-color, #f59e0b) 20%, transparent);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
  overflow: hidden;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.upload-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--module-color, #f59e0b) 30%, transparent);
  background: color-mix(in srgb, var(--module-color, #f59e0b) 10%, transparent);
}

.upload-modal__title {
  display: flex;
  align-items: center;
  color: var(--module-color, #f59e0b);
  font-weight: 600;
}

.upload-modal__close {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--bs-border-color) 40%, transparent);
  color: var(--bs-secondary);
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-modal__close:hover {
  background: color-mix(in srgb, var(--bs-danger) 20%, transparent);
  border-color: var(--bs-danger);
  color: var(--bs-danger);
  transform: rotate(90deg);
}

.upload-modal__body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.document-preview-modal {
  background: var(--bs-body-bg);
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--module-color, #f59e0b) 30%, transparent);
}

.document-preview-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--bs-border-color);
  flex-shrink: 0;
}

.document-preview-modal__title {
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.document-preview-modal__body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.document-preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--bs-secondary);
}

.document-preview-empty {
  padding: 3rem;
  text-align: center;
  color: var(--bs-secondary);
}

.document-preview-content {
  font-size: 0.9rem;
  line-height: 1.6;
}

.document-preview-content :deep(h1) {
  font-size: 1.5rem;
  margin: 1rem 0 0.5rem;
}

.document-preview-content :deep(h2) {
  font-size: 1.25rem;
  margin: 1rem 0 0.5rem;
}

.document-preview-content :deep(h3) {
  font-size: 1.1rem;
  margin: 0.75rem 0 0.5rem;
}

.document-preview-content :deep(code) {
  background: var(--bs-light);
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}

.document-preview-content :deep(.markdown-table-wrapper) {
  overflow-x: auto;
  margin: 1rem 0;
}

.document-preview-content :deep(.markdown-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.document-preview-content :deep(.markdown-table th),
.document-preview-content :deep(.markdown-table td) {
  border: 1px solid var(--bs-border-color);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.document-preview-content :deep(.markdown-table th) {
  background: var(--bs-light);
  font-weight: 600;
}

.tp-assistant-chat__documents-list {
  flex: 0 0 auto;
  max-height: 33%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.75rem 1rem;
  position: relative;
  z-index: 1;
  border-bottom: 1px solid color-mix(in srgb, var(--bs-border-color) 60%, transparent);
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), padding 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.tp-assistant-chat__documents-list--collapsed {
  max-height: 48px;
  padding: 0.5rem 1rem;
}

.documents-grid-wrapper {
  overflow: hidden;
  min-height: 0;
  flex: 1;
}

.documents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  cursor: pointer;
  user-select: none;
  min-height: 32px;
  flex-shrink: 0;
  transition: margin-bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.tp-assistant-chat__documents-list--collapsed .documents-header {
  margin-bottom: 0;
}

.documents-header:hover .documents-header__title {
  color: var(--module-color, #f59e0b);
}

.documents-header__title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: color 0.2s;
}

.documents-header__chevron {
  flex-shrink: 0;
  opacity: 0.7;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
  overflow-y: auto;
  min-height: 0;
}

.document-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.document-card--clickable {
  cursor: pointer;
}

.document-card--clickable:hover {
  background: color-mix(in srgb, var(--module-color, #f59e0b) 5%, var(--bs-light));
}

.document-card:hover {
  border-color: var(--module-color, #f59e0b);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
}

.document-card__icon {
  width: 40px;
  height: 40px;
  background: color-mix(in srgb, var(--module-color, #f59e0b) 15%, transparent);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--module-color, #f59e0b);
  flex-shrink: 0;
}

.document-card__info {
  flex: 1;
  min-width: 0;
}

.document-card__title {
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-card__meta {
  font-size: 0.75rem;
  color: var(--bs-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.25rem;
}

.document-card__delete {
  background: transparent;
  border: none;
  color: var(--bs-danger);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.document-card__delete:hover {
  background: color-mix(in srgb, var(--bs-danger) 15%, transparent);
}

.tp-assistant-chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: transparent;
  position: relative;
  z-index: 1;
}

.tp-assistant-chat__input {
  padding: 1rem;
  border-top: 1px solid color-mix(in srgb, var(--bs-border-color) 50%, transparent);
  background: color-mix(in srgb, var(--bs-body-bg) 70%, transparent);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 2;
}

.input-wrapper {
  width: 100%;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.form-control {
  flex: 1;
}

.documents-info {
  text-align: center;
}

.streaming {
  opacity: 0.8;
}
</style>
