<template>
  <div v-if="isVisible" class="assistant-chat" :class="{ 'assistant-chat--visible': isVisible }">
    <div class="assistant-chat__header">
      <div class="assistant-chat__title">
        <MessageSquare :size="20" class="me-2" />
        <span>AI Ассистент</span>
      </div>
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
          placeholder="Задайте вопрос..."
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
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { Send, MessageSquare } from 'lucide-vue-next'
import AssistantMessage from '../base/AssistantMessage.vue'
import AssistantTyping from '../base/AssistantTyping.vue'
import { ragClient } from './js/rag-client.js'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
})

const messagesContainer = ref(null)
const inputMessage = ref('')
const isTyping = ref(false)
const ollamaChecked = ref(false)

// Счетчик для уникальных ID сообщений
let messageIdCounter = 1

const messages = ref([
  {
    id: messageIdCounter++,
    type: 'assistant',
    content:
      'Привет! Я ваш AI ассистент.\n\n**Чем могу помочь:**\n• Ответить на вопросы\n• Помочь с навигацией\n• Объяснить функционал системы\n\nЗадайте вопрос, и я постараюсь помочь!',
    timestamp: new Date(),
  },
])

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value) {
    return
  }

  const messageText = inputMessage.value.trim()
  
  // Добавляем сообщение пользователя в чат
  const userMessage = {
    id: messageIdCounter++,
    type: 'user',
    content: messageText,
    timestamp: new Date(),
  }
  messages.value.push(userMessage)

  // Очищаем поле ввода
  inputMessage.value = ''
  isTyping.value = true

  scrollToBottom()

  try {
    // Отправляем запрос через RAG клиент
    const result = await ragClient.sendMessage(messageText)
    
    if (result.success) {
      addAssistantMessage(result.response)
    } else {
      // Форматируем сообщение об ошибке более понятно
      let errorMessage = result.error || 'Неизвестная ошибка'
      
      // Если ошибка связана с Ollama, добавляем инструкции
      if (errorMessage.includes('Ollama') || errorMessage.includes('ollama')) {
        errorMessage = `⚠️ **Ошибка подключения к Ollama**\n\n` +
          `${errorMessage}\n\n` +
          `**Что нужно сделать:**\n` +
          `1. Убедитесь, что Ollama установлен и запущен\n` +
          `2. Проверьте доступность Ollama по адресу: http://localhost:11434\n` +
          `3. Установите Ollama: https://ollama.com/download`
      }
      
      addAssistantMessage(`❌ **Ошибка:** ${errorMessage}`)
    }
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error)
    
    // Извлекаем сообщение об ошибке
    const errorMessage = 
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Не удалось отправить сообщение'
    
    addAssistantMessage(`❌ **Ошибка подключения:** ${errorMessage}`)
  } finally {
    isTyping.value = false
  }
}

const addAssistantMessage = (content) => {
  const assistantMessage = {
    id: messageIdCounter++,
    type: 'assistant',
    content: content,
    timestamp: new Date(),
  }

  messages.value.push(assistantMessage)
  scrollToBottom()
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

// Проверка Ollama при первом открытии чата
watch(
  () => props.isVisible,
  async (newValue) => {
    if (newValue && !ollamaChecked.value) {
      ollamaChecked.value = true
      await checkOllamaConnection()
    }
  },
  { immediate: true }
)

const checkOllamaConnection = async () => {
  try {
    isTyping.value = true
    const status = await ragClient.checkOllamaStatus()
    
    if (!status.available) {
      addAssistantMessage(
        `⚠️ **Внимание:** Не удалось подключиться к Ollama.\n\n` +
        `**Что нужно сделать:**\n` +
        `1. Убедитесь, что Ollama установлен и запущен\n` +
        `2. Проверьте доступность Ollama по адресу: http://localhost:11434\n` +
        `3. Установите Ollama: https://ollama.com/download\n\n` +
        `**Текущая ошибка:** ${status.message || 'Неизвестная ошибка'}\n\n` +
        `Без подключения к Ollama я не смогу отвечать на ваши вопросы.`
      )
    }
  } catch (error) {
    console.error('Ошибка проверки Ollama:', error)
    addAssistantMessage(
      `⚠️ **Ошибка проверки подключения к Ollama:**\n\n${error.message}\n\n` +
      `Пожалуйста, убедитесь, что Ollama запущен и доступен.`
    )
  } finally {
    isTyping.value = false
  }
}

defineExpose({
  addAssistantMessage,
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
    0 12px 40px rgba(13, 110, 253, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(13, 110, 253, 0.1);
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
  background: linear-gradient(135deg, #0d6efd, #0a58ca);
  border-radius: 12px 12px 0 0;
  color: white;
}

.assistant-chat__title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
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
  background: rgba(13, 110, 253, 0.1);
  border-radius: 2px;
}

.assistant-chat__messages::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #0d6efd, #0a58ca);
  border-radius: 2px;
}

.assistant-chat__input {
  padding: 16px;
  border-top: 1px solid rgba(13, 110, 253, 0.1);
  background: linear-gradient(145deg, #f8f9fa, #ffffff);
  border-radius: 0 0 12px 12px;
}

.assistant-chat__input .form-control {
  border: 2px solid rgba(13, 110, 253, 0.2);
  border-right: none;
  border-radius: 8px 0 0 8px;
  padding: 10px 14px;
  transition: all 0.3s ease;
  font-size: 14px;
}

.assistant-chat__input .form-control:focus {
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
  border-color: #0d6efd;
}

.assistant-chat__input .btn {
  border-radius: 0 8px 8px 0;
  border: 2px solid #0d6efd;
  padding: 10px 16px;
  transition: all 0.3s ease;
}

.assistant-chat__input .btn:hover {
  background: linear-gradient(135deg, #0b5ed7, #0d6efd);
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

