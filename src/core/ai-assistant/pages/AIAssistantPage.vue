<template>
  <div class="ai-assistant-page">
    <!-- Sidebar с историей чатов -->
    <aside class="ai-sidebar">
      <div class="ai-sidebar__header">
        <button class="new-chat-btn" @click="startNewChat">
          <Plus :size="18" />
          <span>Новый чат</span>
        </button>
      </div>
      
      <div class="ai-sidebar__history">
        <div class="history-section">
          <div class="history-title">Сегодня</div>
          <div 
            v-for="chat in todayChats" 
            :key="chat.id"
            class="history-item"
            :class="{ active: currentChatId === chat.id }"
            @click="selectChat(chat.id)"
          >
            <MessageSquare :size="16" />
            <span>{{ chat.title }}</span>
          </div>
        </div>
      </div>
      
      <div class="ai-sidebar__footer">
        <router-link to="/ai-assistant/bi" class="sidebar-link">
          <Database :size="18" />
          <span>BI Анализ</span>
        </router-link>
      </div>
    </aside>

    <!-- Основная область чата -->
    <main class="ai-main">
      <!-- Пустое состояние -->
      <div v-if="messages.length <= 1" class="ai-welcome">
        <div class="ai-welcome__logo">
          <Bot :size="48" />
        </div>
        <h1 class="ai-welcome__title">AI Ассистент ERGO MS</h1>
        <p class="ai-welcome__subtitle">Чем могу помочь?</p>
        
        <div class="ai-welcome__suggestions">
          <button 
            v-for="suggestion in suggestions" 
            :key="suggestion"
            class="suggestion-btn"
            @click="sendSuggestion(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>

      <!-- Сообщения чата -->
      <div v-else ref="messagesContainer" class="ai-messages">
        <div 
          v-for="message in messages" 
          :key="message.id"
          class="ai-message"
          :class="`ai-message--${message.type}`"
        >
          <div class="ai-message__avatar">
            <User v-if="message.type === 'user'" :size="20" />
            <Bot v-else :size="20" />
          </div>
          <div class="ai-message__content">
            <div class="ai-message__text" v-html="formatMarkdown(message.content)"></div>
            <div v-if="message.type === 'assistant' && message.content" class="ai-message__actions">
              <button class="action-btn" @click="copyMessage(message.content)" title="Копировать">
                <Copy :size="14" />
              </button>
            </div>
          </div>
        </div>
        
        <!-- Typing indicator - показывается пока ждём ответ -->
        <div v-if="isTyping" class="ai-message ai-message--assistant">
          <div class="ai-message__avatar">
            <Bot :size="20" />
          </div>
          <div class="ai-message__content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Поле ввода -->
      <div class="ai-input-area">
        <div class="ai-input-wrapper">
          <textarea
            ref="inputArea"
            v-model="inputMessage"
            class="ai-input"
            placeholder="Напишите сообщение..."
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
            @input="autoResize"
            :disabled="isTyping"
          ></textarea>
          <button 
            class="ai-send-btn"
            @click="sendMessage"
            :disabled="!inputMessage.trim() || isTyping"
          >
            <Send :size="20" />
          </button>
        </div>
        <p class="ai-disclaimer">
          AI может допускать ошибки. Проверяйте важную информацию.
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { Bot, User, Send, Plus, MessageSquare, Database, Copy } from 'lucide-vue-next'
import { ragClient } from '../rag/js/rag-client.js'

const messagesContainer = ref(null)
const inputArea = ref(null)
const inputMessage = ref('')
const isTyping = ref(false)
const currentChatId = ref(1)

let messageIdCounter = 1

const messages = ref([
  {
    id: messageIdCounter++,
    type: 'assistant',
    content: 'Привет! Я AI ассистент системы ERGO MS. Чем могу помочь?',
    timestamp: new Date(),
  },
])

const todayChats = ref([
  { id: 1, title: 'Новый чат' },
])

const suggestions = [
  'Как работает система?',
  'Расскажи о возможностях BI',
  'Помоги с анализом данных',
  'Что такое датасеты?',
]

const formatMarkdown = (text) => {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

const autoResize = () => {
  nextTick(() => {
    if (inputArea.value) {
      inputArea.value.style.height = 'auto'
      inputArea.value.style.height = Math.min(inputArea.value.scrollHeight, 200) + 'px'
    }
  })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// ID текущего streaming сообщения
let streamingMessageId = null

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value) return

  const messageText = inputMessage.value.trim()
  
  messages.value.push({
    id: messageIdCounter++,
    type: 'user',
    content: messageText,
    timestamp: new Date(),
  })

  inputMessage.value = ''
  isTyping.value = true
  autoResize()
  scrollToBottom()

  // ID сообщения будет присвоен при получении первого чанка
  streamingMessageId = null

  try {
    await ragClient.sendMessageStream(
      messageText,
      // onChunk - добавляем текст по мере поступления
      (chunk) => {
        // Создаём сообщение при получении первого чанка
        if (!streamingMessageId) {
          streamingMessageId = messageIdCounter++
          messages.value.push({
            id: streamingMessageId,
            type: 'assistant',
            content: chunk,
            timestamp: new Date(),
          })
          // Скрываем typing indicator после получения первого чанка
          isTyping.value = false
        } else {
          const msg = messages.value.find(m => m.id === streamingMessageId)
          if (msg) {
            msg.content += chunk
          }
        }
        scrollToBottom()
      },
      // onDone - завершаем streaming
      (fullResponse) => {
        if (streamingMessageId) {
          const msg = messages.value.find(m => m.id === streamingMessageId)
          if (msg && fullResponse) {
            msg.content = fullResponse
          }
        } else if (fullResponse) {
          // Если не было чанков, но есть полный ответ - создаём сообщение
          messages.value.push({
            id: messageIdCounter++,
            type: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          })
        }
        isTyping.value = false
        streamingMessageId = null
        scrollToBottom()
      },
      // onError - обрабатываем ошибку
      (errorMsg) => {
        // Если уже есть сообщение - добавляем ошибку туда
        if (streamingMessageId) {
          const msg = messages.value.find(m => m.id === streamingMessageId)
          if (msg) {
            msg.content += `\n\n❌ **Ошибка:** ${errorMsg || 'Неизвестная ошибка'}`
          }
        } else {
          // Иначе создаём новое сообщение с ошибкой
          messages.value.push({
            id: messageIdCounter++,
            type: 'assistant',
            content: `❌ **Ошибка:** ${errorMsg || 'Неизвестная ошибка'}`,
            timestamp: new Date(),
          })
        }
        isTyping.value = false
        streamingMessageId = null
        scrollToBottom()
      }
    )
  } catch (error) {
    // Если уже есть сообщение - добавляем ошибку туда
    if (streamingMessageId) {
      const msg = messages.value.find(m => m.id === streamingMessageId)
      if (msg) {
        msg.content += `\n\n❌ **Ошибка подключения:** ${error.message}`
      }
    } else {
      // Иначе создаём новое сообщение с ошибкой
      messages.value.push({
        id: messageIdCounter++,
        type: 'assistant',
        content: `❌ **Ошибка подключения:** ${error.message}`,
        timestamp: new Date(),
      })
    }
    isTyping.value = false
    streamingMessageId = null
    scrollToBottom()
  }
}

const sendSuggestion = (text) => {
  inputMessage.value = text
  sendMessage()
}

const startNewChat = () => {
  messages.value = [{
    id: messageIdCounter++,
    type: 'assistant',
    content: 'Привет! Я AI ассистент системы ERGO MS. Чем могу помочь?',
    timestamp: new Date(),
  }]
}

const selectChat = (id) => {
  currentChatId.value = id
}

const copyMessage = async (text) => {
  try {
    await navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ''))
  } catch (err) {
    console.error('Не удалось скопировать:', err)
  }
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.ai-assistant-page {
  display: flex;
  height: 100vh;
  background: #212121;
  color: #ececec;
  font-family: 'Söhne', 'ui-sans-serif', system-ui, -apple-system, sans-serif;
}

/* Sidebar */
.ai-sidebar {
  width: 260px;
  background: #171717;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #2f2f2f;
}

.ai-sidebar__header {
  padding: 12px;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: 1px solid #565656;
  border-radius: 8px;
  color: #ececec;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}

.new-chat-btn:hover {
  background: #2f2f2f;
}

.ai-sidebar__history {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.history-section {
  margin-bottom: 24px;
}

.history-title {
  font-size: 12px;
  font-weight: 600;
  color: #8e8e8e;
  padding: 8px 12px;
  text-transform: uppercase;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: #ececec;
  font-size: 14px;
  transition: background 0.2s;
}

.history-item:hover {
  background: #2f2f2f;
}

.history-item.active {
  background: #2f2f2f;
}

.history-item span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-sidebar__footer {
  padding: 12px;
  border-top: 1px solid #2f2f2f;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #ececec;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s;
}

.sidebar-link:hover {
  background: #2f2f2f;
}

/* Main area */
.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Welcome state */
.ai-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.ai-welcome__logo {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #10a37f, #1a7f64);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 24px;
}

.ai-welcome__title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px;
}

.ai-welcome__subtitle {
  font-size: 16px;
  color: #8e8e8e;
  margin: 0 0 32px;
}

.ai-welcome__suggestions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 600px;
}

.suggestion-btn {
  padding: 16px;
  background: #2f2f2f;
  border: 1px solid #424242;
  border-radius: 12px;
  color: #ececec;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-btn:hover {
  background: #424242;
  border-color: #565656;
}

/* Messages */
.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
}

.ai-message {
  display: flex;
  gap: 16px;
  padding: 24px 16%;
  transition: background 0.2s;
}

.ai-message--assistant {
  background: #2f2f2f;
}

.ai-message__avatar {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-message--user .ai-message__avatar {
  background: #5436da;
  color: white;
}

.ai-message--assistant .ai-message__avatar {
  background: #10a37f;
  color: white;
}

.ai-message__content {
  flex: 1;
  min-width: 0;
}

.ai-message__text {
  line-height: 1.7;
  font-size: 16px;
}

.ai-message__text :deep(code) {
  background: #424242;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Söhne Mono', monospace;
  font-size: 14px;
}

.ai-message__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.ai-message:hover .ai-message__actions {
  opacity: 1;
}

.action-btn {
  padding: 6px;
  background: transparent;
  border: none;
  color: #8e8e8e;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #424242;
  color: #ececec;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #8e8e8e;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* Input area */
.ai-input-area {
  padding: 16px 16%;
  background: #212121;
}

.ai-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: #40414f;
  border-radius: 16px;
  padding: 12px 16px;
  border: 1px solid #565656;
  transition: border-color 0.2s;
}

.ai-input-wrapper:focus-within {
  border-color: #10a37f;
}

.ai-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ececec;
  font-size: 16px;
  line-height: 1.5;
  resize: none;
  max-height: 200px;
  font-family: inherit;
}

.ai-input::placeholder {
  color: #8e8e8e;
}

.ai-send-btn {
  width: 36px;
  height: 36px;
  background: #10a37f;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.ai-send-btn:hover:not(:disabled) {
  background: #1a7f64;
}

.ai-send-btn:disabled {
  background: #565656;
  cursor: not-allowed;
}

.ai-disclaimer {
  text-align: center;
  font-size: 12px;
  color: #8e8e8e;
  margin: 12px 0 0;
}

/* Scrollbar */
.ai-messages::-webkit-scrollbar,
.ai-sidebar__history::-webkit-scrollbar {
  width: 6px;
}

.ai-messages::-webkit-scrollbar-track,
.ai-sidebar__history::-webkit-scrollbar-track {
  background: transparent;
}

.ai-messages::-webkit-scrollbar-thumb,
.ai-sidebar__history::-webkit-scrollbar-thumb {
  background: #565656;
  border-radius: 3px;
}

/* Responsive */
@media (max-width: 768px) {
  .ai-sidebar {
    display: none;
  }
  
  .ai-message {
    padding: 16px 5%;
  }
  
  .ai-input-area {
    padding: 16px 5%;
  }
  
  .ai-welcome__suggestions {
    grid-template-columns: 1fr;
  }
}
</style>

