<template>
  <div v-if="isVisible" class="assistant-chat" :class="{ 'assistant-chat--visible': isVisible }">
    <div class="assistant-chat__header">
      <div class="assistant-chat__title">
        <Database :size="20" class="me-2" />
        <span>AI Ассистент - BI Анализ</span>
      </div>
    </div>

    <!-- Выбор файла -->
    <div v-if="!selectedFile" class="assistant-chat__file-selector">
      <FileSelector ref="fileSelector" @file-selected="onFileSelected" />
    </div>

    <!-- Информация о выбранном файле -->
    <div v-if="selectedFile" class="assistant-chat__selected-file">
      <div class="selected-file-info">
        <FileSpreadsheet :size="16" />
        <span>{{ selectedFile.name }}</span>
      </div>
      <button class="btn btn-sm btn-outline-secondary" @click="changeFile">
        Сменить файл
      </button>
    </div>

    <div ref="messagesContainer" class="assistant-chat__messages">
      <AssistantMessage v-for="message in messages" :key="message.id" :message="message" />

      <AssistantTyping v-if="isTyping" />
    </div>

    <div class="assistant-chat__input">
      <div class="input-group">
        <input
          v-model="inputMessage"
          type="text"
          class="form-control"
          :placeholder="!selectedFile ? 'Сначала выберите файл для анализа' : 'Задайте вопрос к данным...'"
          @keypress.enter="sendMessage"
          :disabled="isTyping || !selectedFile"
        />
        <button
          class="btn btn-danger"
          @click="sendMessage"
          :disabled="!inputMessage.trim() || isTyping || !selectedFile"
        >
          <Send :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { Send, Database, FileSpreadsheet } from 'lucide-vue-next'
import AssistantMessage from './AssistantMessage.vue'
import AssistantTyping from './AssistantTyping.vue'
import FileSelector from './FileSelector.vue'

const emit = defineEmits(['bi-query'])

defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
})

const messagesContainer = ref(null)
const fileSelector = ref(null)
const inputMessage = ref('')
const isTyping = ref(false)
const selectedFile = ref(null)

const messages = ref([
  {
    id: 1,
    type: 'assistant',
    content:
      'Привет! Я ваш AI ассистент для анализа данных.\n\n**Что я умею:**\n• Анализировать табличные данные\n• Генерировать SQL запросы\n• Находить закономерности\n• Предоставлять статистику\n\n**Начните с выбора файла** для анализа данных!',
    timestamp: new Date(),
  },
])

const onFileSelected = (file) => {
  selectedFile.value = file
  addAssistantMessage(
    `✅ Выбран файл: **${file.name}**\n\nТеперь вы можете задавать вопросы к данным. Например:\n• "Покажи первые 10 строк"\n• "Какие колонки в файле?"\n• "Посчитай среднее значение"\n• "Найди максимум по категориям"`,
  )
}

const changeFile = () => {
  selectedFile.value = null
  addAssistantMessage('Выберите другой файл для анализа.')
}

const sendMessage = () => {
  if (!inputMessage.value.trim() || isTyping.value || !selectedFile.value) {
    return
  }

  const messageText = inputMessage.value.trim()
  
  // Добавляем сообщение пользователя в чат
  const userMessage = {
    id: Date.now(),
    type: 'user',
    content: messageText,
    timestamp: new Date(),
  }
  messages.value.push(userMessage)

  // Очищаем поле ввода
  inputMessage.value = ''
  isTyping.value = true

  // Отправляем запрос
  emit('bi-query', {
    fileId: selectedFile.value.id,
    question: messageText,
  })

  scrollToBottom()
}

const addAssistantMessage = (content, data = null) => {
  const assistantMessage = {
    id: Date.now(),
    type: 'assistant',
    content: content,
    data: data, // Дополнительные данные (SQL, таблица и т.д.)
    timestamp: new Date(),
  }

  messages.value.push(assistantMessage)
  isTyping.value = false
  scrollToBottom()
}

const updateStreamingMessage = (messageId, updates) => {
  isTyping.value = false
  
  let message = messages.value.find(m => m.id === messageId)
  
  if (!message) {
    // Создаем новое streaming сообщение
    message = {
      id: messageId,
      type: 'assistant',
      content: '',
      streaming: true,
      stage: '',
      sql: '',
      sqlGenerating: '',
      data: null,
      error: null,
      timestamp: new Date(),
    }
    messages.value.push(message)
  }
  
  // Обновляем сообщение
  Object.assign(message, updates)
  
  scrollToBottom()
}

const finalizeStreamingMessage = (messageId) => {
  const message = messages.value.find(m => m.id === messageId)
  
  if (message) {
    message.streaming = false
    message.stage = ''
  }
  
  isTyping.value = false
  scrollToBottom()
}

const setTyping = (typing) => {
  isTyping.value = typing
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(
  () => messages.value.length,
  () => {
    scrollToBottom()
  },
)

defineExpose({
  addAssistantMessage,
  updateStreamingMessage,
  finalizeStreamingMessage,
  setTyping,
})
</script>

<style scoped>
.assistant-chat {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  width: auto;
  height: 550px;
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border-radius: 12px;
  box-shadow:
    0 12px 40px rgba(220, 53, 69, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(220, 53, 69, 0.1);
  z-index: 9998;
  display: flex;
  flex-direction: column;
  transform: translateY(20px) scale(0.95);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  margin-bottom: 10px;
}

.assistant-chat--visible {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.assistant-chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #dc3545, #c82333);
  border-radius: 12px 12px 0 0;
  color: white;
}

.assistant-chat__title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
}

.assistant-chat__file-selector {
  max-height: 350px;
  overflow-y: auto;
  background: white;
  border-bottom: 1px solid rgba(220, 53, 69, 0.1);
}

.assistant-chat__selected-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #e7f3ff;
  border-bottom: 1px solid rgba(13, 110, 253, 0.2);
}

.selected-file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #0d6efd;
}

.assistant-chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
}

.assistant-chat__messages::-webkit-scrollbar {
  width: 4px;
}

.assistant-chat__messages::-webkit-scrollbar-track {
  background: rgba(220, 53, 69, 0.1);
  border-radius: 2px;
}

.assistant-chat__messages::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #dc3545, #c82333);
  border-radius: 2px;
}

.assistant-chat__input {
  padding: 16px;
  border-top: 1px solid rgba(220, 53, 69, 0.1);
  background: linear-gradient(145deg, #f8f9fa, #ffffff);
  border-radius: 0 0 12px 12px;
}

.assistant-chat__input .form-control {
  border: 2px solid rgba(220, 53, 69, 0.2);
  border-right: none;
  border-radius: 8px 0 0 8px;
  padding: 10px 14px;
  transition: all 0.3s ease;
  font-size: 14px;
}

.assistant-chat__input .form-control:focus {
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
  border-color: #dc3545;
}

.assistant-chat__input .btn {
  border-radius: 0 8px 8px 0;
  border: 2px solid #dc3545;
  padding: 10px 16px;
  transition: all 0.3s ease;
}

.assistant-chat__input .btn:hover {
  background: linear-gradient(135deg, #e74c3c, #dc3545);
  transform: scale(1.02);
}

@media (max-width: 1200px) {
  .assistant-chat {
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    width: auto;
    height: 400px;
    margin-bottom: 0;
  }
}
</style>
