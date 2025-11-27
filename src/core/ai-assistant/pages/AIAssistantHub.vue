<template>
  <div class="ai-hub" :class="{ 'ai-hub--light': isLightTheme }">
    <!-- Sidebar -->
    <aside class="ai-hub__sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo__icon">
            <Sparkles :size="24" />
          </div>
          <div class="sidebar-logo__text">
            <span class="sidebar-logo__title">AI Hub</span>
            <span class="sidebar-logo__subtitle">ERGO MS</span>
          </div>
        </div>
        <button class="theme-btn" @click="toggleTheme" :title="isLightTheme ? 'Тёмная тема' : 'Светлая тема'">
          <Sun v-if="isLightTheme" :size="18" />
          <Moon v-else :size="18" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-label">Ассистенты</div>
        
        <button 
          v-for="module in modules" 
          :key="module.id"
          class="nav-module"
          :class="{ 
            'nav-module--active': activeModule === module.id,
            'nav-module--coming-soon': module.comingSoon 
          }"
          :style="activeModule === module.id ? { '--module-color': module.color, '--module-color-light': module.colorLight } : {}"
          @click="switchModule(module.id)"
        >
          <div class="nav-module__icon" :style="{ color: module.color }">
            <component :is="module.icon" :size="20" />
          </div>
          <div class="nav-module__info">
            <span class="nav-module__name">{{ module.name }}</span>
            <span class="nav-module__desc">{{ module.description }}</span>
          </div>
          <span v-if="module.comingSoon" class="nav-module__badge">Скоро</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="model-status" :class="{ 'model-status--online': ollamaOnline }">
          <div class="model-status__dot"></div>
          <Cpu :size="14" />
          <span>{{ currentModel }}</span>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="ai-hub__main">
      <!-- Module Header -->
      <header class="module-header">
        <div class="module-header__info">
          <div class="module-header__icon" :style="{ background: currentModuleConfig?.colorLight, color: currentModuleConfig?.color }">
            <component :is="currentModuleConfig?.icon" :size="24" />
          </div>
          <div>
            <h1 class="module-header__title">{{ currentModuleConfig?.name }}</h1>
            <p class="module-header__desc">{{ currentModuleConfig?.description }}</p>
          </div>
        </div>
        <div class="module-header__actions">
          <button class="action-btn" @click="clearHistory" title="Очистить историю">
            <Trash2 :size="18" />
          </button>
        </div>
      </header>

      <!-- Coming Soon State -->
      <div v-if="currentModuleConfig?.comingSoon" class="coming-soon">
        <div class="coming-soon__icon" :style="{ background: currentModuleConfig?.colorLight }">
          <component :is="currentModuleConfig?.icon" :size="48" :style="{ color: currentModuleConfig?.color }" />
        </div>
        <h2 class="coming-soon__title">В разработке</h2>
        <p class="coming-soon__text">Модуль "{{ currentModuleConfig?.name }}" скоро будет доступен</p>
        <div class="coming-soon__suggestions">
          <span class="coming-soon__label">Планируемые возможности:</span>
          <div class="coming-soon__tags">
            <span v-for="s in currentModuleConfig?.suggestions" :key="s" class="coming-soon__tag">{{ s }}</span>
          </div>
        </div>
      </div>

      <!-- Chat Module -->
      <template v-else-if="activeModule === 'chat'">
        <div ref="chatMessagesRef" class="messages-container">
          <HubMessage 
            v-for="msg in chatHistory" 
            :key="msg.id" 
            :message="msg" 
            :module-config="currentModuleConfig"
          />
          <div v-if="chatLoading && !hasChatStreamingContent" class="typing-indicator">
            <div class="typing-indicator__avatar" :style="{ background: currentModuleConfig?.color }">
              <component :is="currentModuleConfig?.icon" :size="18" />
            </div>
            <div class="typing-indicator__dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div class="input-container">
          <div class="suggestions" v-if="chatHistory.length <= 1">
            <button 
              v-for="s in currentModuleConfig?.suggestions" 
              :key="s" 
              class="suggestion-btn"
              @click="sendChatMessage(s)"
            >
              <Zap :size="14" />
              {{ s }}
            </button>
          </div>
          <div class="input-box">
            <textarea
              v-model="chatInput"
              class="input-field"
              :placeholder="currentModuleConfig?.settings?.placeholder"
              @keydown.enter.exact.prevent="sendChatMessage()"
              :disabled="chatLoading"
              rows="1"
              ref="chatInputRef"
            ></textarea>
            <button 
              class="send-btn" 
              :style="{ background: currentModuleConfig?.color }"
              @click="sendChatMessage()"
              :disabled="!chatInput.trim() || chatLoading"
            >
              <ArrowUp :size="20" />
            </button>
          </div>
        </div>
      </template>

      <!-- BI Module -->
      <template v-else-if="activeModule === 'bi'">
        <!-- File Selection -->
        <div v-if="!selectedFile" class="file-selector">
          <div class="file-selector__header">
            <FolderOpen :size="20" />
            <span>Выберите файл для анализа</span>
          </div>
          <div class="file-list">
            <div 
              v-for="file in files" 
              :key="file.id"
              class="file-card"
              @click="selectFile(file)"
            >
              <div class="file-card__icon">
                <FileSpreadsheet :size="24" />
              </div>
              <div class="file-card__info">
                <span class="file-card__name">{{ file.name }}</span>
                <span class="file-card__meta">{{ file.original_filename }}</span>
              </div>
              <ChevronRight :size="18" class="file-card__arrow" />
            </div>
            <div v-if="files.length === 0" class="file-list__empty">
              <FileQuestion :size="48" />
              <p>Нет загруженных файлов</p>
              <router-link to="/bi/connections/new/file" class="upload-btn">
                <Upload :size="16" />
                Загрузить файл
              </router-link>
            </div>
          </div>
        </div>

        <!-- BI Chat -->
        <template v-else>
          <div class="selected-file">
            <FileSpreadsheet :size="18" />
            <span>{{ selectedFile.name }}</span>
            <button class="selected-file__change" @click="selectedFile = null">
              <X :size="16" />
              <span>Сменить</span>
            </button>
          </div>

          <div ref="biMessagesRef" class="messages-container">
            <HubMessage 
              v-for="msg in biHistory" 
              :key="msg.id" 
              :message="msg" 
              :module-config="currentModuleConfig"
            />
            <div v-if="biLoading" class="typing-indicator">
              <div class="typing-indicator__avatar" :style="{ background: currentModuleConfig?.color }">
                <component :is="currentModuleConfig?.icon" :size="18" />
              </div>
              <div class="typing-indicator__dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <div class="input-container">
            <div class="suggestions" v-if="biHistory.length <= 1">
              <button 
                v-for="s in currentModuleConfig?.suggestions" 
                :key="s" 
                class="suggestion-btn"
                @click="sendBIMessage(s)"
              >
                <Zap :size="14" />
                {{ s }}
              </button>
            </div>
            <div class="input-box">
              <textarea
                v-model="biInput"
                class="input-field"
                :placeholder="currentModuleConfig?.settings?.placeholder"
                @keydown.enter.exact.prevent="sendBIMessage()"
                :disabled="biLoading"
                rows="1"
              ></textarea>
              <button 
                class="send-btn" 
                :style="{ background: currentModuleConfig?.color }"
                @click="sendBIMessage()"
                :disabled="!biInput.trim() || biLoading"
              >
                <ArrowUp :size="20" />
              </button>
            </div>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { 
  Sparkles, Sun, Moon, Cpu, Trash2, ArrowUp, Zap, ChevronRight,
  FolderOpen, FileSpreadsheet, FileQuestion, Upload, X
} from 'lucide-vue-next'
import { modules, getModuleById } from '../modules/index.js'
import HubMessage from '../components/HubMessage.vue'
import { ragClient } from '../rag/js/rag-client.js'
import { biClient } from '../bi/js/bi-client.js'

// Theme
const isLightTheme = ref(localStorage.getItem('ai-hub-theme') === 'light')
const toggleTheme = () => {
  isLightTheme.value = !isLightTheme.value
  localStorage.setItem('ai-hub-theme', isLightTheme.value ? 'light' : 'dark')
}

// Module state
const activeModule = ref('chat')
const currentModuleConfig = computed(() => getModuleById(activeModule.value))

const switchModule = (id) => {
  activeModule.value = id
}

// Ollama status
const currentModel = ref('Загрузка...')
const ollamaOnline = ref(false)

// Chat state
const chatMessagesRef = ref(null)
const chatInputRef = ref(null)
const chatInput = ref('')
const chatLoading = ref(false)
let chatMsgId = 1
const chatHistory = ref([])

// Проверяем, есть ли контент в streaming сообщении чата
const hasChatStreamingContent = computed(() => {
  const streamingMsg = chatHistory.value.find(m => m.isStreaming)
  return streamingMsg && streamingMsg.content && streamingMsg.content.length > 0
})

// BI state
const biMessagesRef = ref(null)
const biInput = ref('')
const biLoading = ref(false)
const selectedFile = ref(null)
const files = ref([])
let biMsgId = 1
const biHistory = ref([])

// Initialize chat with welcome message
const initChat = () => {
  const config = getModuleById('chat')
  chatHistory.value = [{
    id: chatMsgId++,
    type: 'assistant',
    content: config?.settings?.welcomeMessage || 'Привет! Чем могу помочь?',
    timestamp: new Date(),
  }]
}

// Scroll helpers
const scrollToBottom = (container) => {
  nextTick(() => {
    if (container?.value) {
      container.value.scrollTop = container.value.scrollHeight
    }
  })
}

// Chat methods
let chatStreamingMsgId = null

const sendChatMessage = async (text) => {
  const messageText = text || chatInput.value.trim()
  if (!messageText || chatLoading.value) return

  chatHistory.value.push({ 
    id: chatMsgId++, 
    type: 'user', 
    content: messageText,
    timestamp: new Date(),
  })
  chatInput.value = ''
  chatLoading.value = true
  scrollToBottom(chatMessagesRef)

  // Создаём пустое сообщение для streaming
  chatStreamingMsgId = chatMsgId++
  chatHistory.value.push({
    id: chatStreamingMsgId,
    type: 'assistant',
    content: '',
    timestamp: new Date(),
    isStreaming: true,
  })
  scrollToBottom(chatMessagesRef)

  try {
    await ragClient.sendMessageStream(
      messageText,
      // onChunk
      (chunk) => {
        const msg = chatHistory.value.find(m => m.id === chatStreamingMsgId)
        if (msg) {
          msg.content += chunk
          scrollToBottom(chatMessagesRef)
        }
      },
      // onDone
      (fullResponse) => {
        const msg = chatHistory.value.find(m => m.id === chatStreamingMsgId)
        if (msg) {
          msg.content = fullResponse
          msg.isStreaming = false
        }
        chatLoading.value = false
        chatStreamingMsgId = null
        scrollToBottom(chatMessagesRef)
      },
      // onError
      (errorMsg) => {
        const msg = chatHistory.value.find(m => m.id === chatStreamingMsgId)
        if (msg) {
          msg.content = `Ошибка: ${errorMsg}`
          msg.isStreaming = false
        }
        chatLoading.value = false
        chatStreamingMsgId = null
        scrollToBottom(chatMessagesRef)
      }
    )
  } catch (e) {
    const msg = chatHistory.value.find(m => m.id === chatStreamingMsgId)
    if (msg) {
      msg.content = `Ошибка: ${e.message}`
      msg.isStreaming = false
    }
    chatLoading.value = false
    chatStreamingMsgId = null
    scrollToBottom(chatMessagesRef)
  }
}

// BI methods
const loadFiles = async () => {
  try {
    const result = await biClient.getUserFiles()
    if (result.success) files.value = result.files
  } catch (e) {
    console.error('Ошибка загрузки файлов:', e)
  }
}

const selectFile = (file) => {
  selectedFile.value = file
  const config = getModuleById('bi')
  biHistory.value = [{
    id: biMsgId++,
    type: 'assistant',
    content: `Файл **${file.name}** выбран для анализа. Задайте вопрос к данным.`,
    timestamp: new Date(),
  }]
}

const sendBIMessage = async (text) => {
  const messageText = text || biInput.value.trim()
  if (!messageText || biLoading.value || !selectedFile.value) return

  biHistory.value.push({ 
    id: biMsgId++, 
    type: 'user', 
    content: messageText,
    timestamp: new Date(),
  })
  biInput.value = ''
  biLoading.value = true
  scrollToBottom(biMessagesRef)

  const responseId = biMsgId++

  try {
    await biClient.askQuestionStream(selectedFile.value.id, messageText, true, null, (event) => {
      let msg = biHistory.value.find(m => m.id === responseId)
      if (!msg) {
        msg = { 
          id: responseId, 
          type: 'assistant', 
          content: '', 
          sql: null, 
          data: null, 
          stage: '',
          timestamp: new Date(),
        }
        biHistory.value.push(msg)
        biLoading.value = false
      }

      switch (event.type) {
        case 'stage':
          msg.stage = event.message || event.text || ''
          break
        case 'sql':
          msg.sql = event.text || ''
          msg.stage = ''
          break
        case 'commentary':
          msg.content += event.text || ''
          break
        case 'complete':
          msg.data = { rows: event.rows, columns: event.columns, data: event.data }
          msg.sql = event.sql || msg.sql
          msg.stage = ''
          break
        case 'error':
          msg.content = `Ошибка: ${event.message || event.text}`
          msg.stage = ''
          break
        case 'done':
          msg.stage = ''
          break
      }
      scrollToBottom(biMessagesRef)
    })
  } catch (e) {
    biHistory.value.push({ 
      id: biMsgId++, 
      type: 'assistant', 
      content: `Ошибка: ${e.message}`,
      timestamp: new Date(),
    })
  } finally {
    biLoading.value = false
    scrollToBottom(biMessagesRef)
  }
}

const clearHistory = () => {
  if (activeModule.value === 'chat') {
    initChat()
  } else if (activeModule.value === 'bi') {
    const config = getModuleById('bi')
    biHistory.value = selectedFile.value ? [{
      id: biMsgId++,
      type: 'assistant',
      content: `Файл **${selectedFile.value.name}** выбран для анализа. Задайте вопрос к данным.`,
      timestamp: new Date(),
    }] : []
  }
}

const checkOllamaStatus = async () => {
  try {
    const status = await ragClient.checkOllamaStatus()
    ollamaOnline.value = status.available
    currentModel.value = status.available ? (status.model || 'Ollama') : 'Недоступен'
  } catch {
    ollamaOnline.value = false
    currentModel.value = 'Ошибка'
  }
}

onMounted(() => {
  initChat()
  loadFiles()
  checkOllamaStatus()
})
</script>

<style lang="scss" scoped>
@import '../styles/variables';

.ai-hub {
  --bg-primary: #{$dark-bg-primary};
  --bg-secondary: #{$dark-bg-secondary};
  --bg-tertiary: #{$dark-bg-tertiary};
  --bg-elevated: #{$dark-bg-elevated};
  --bg-hover: #{$dark-bg-hover};
  --border: #{$dark-border};
  --text-primary: #{$dark-text-primary};
  --text-secondary: #{$dark-text-secondary};
  --text-muted: #{$dark-text-muted};
  --text-placeholder: #{$dark-text-placeholder};
  --accent: #{$accent-blue};
  --accent-light: #{$accent-blue-light};

  display: flex;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: $font-family-base;

  &--light {
    --bg-primary: #{$light-bg-primary};
    --bg-secondary: #{$light-bg-secondary};
    --bg-tertiary: #{$light-bg-tertiary};
    --bg-elevated: #{$light-bg-elevated};
    --bg-hover: #{$light-bg-hover};
    --border: #{$light-border};
    --text-primary: #{$light-text-primary};
    --text-secondary: #{$light-text-secondary};
    --text-muted: #{$light-text-muted};
    --text-placeholder: #{$light-text-placeholder};
  }
}

// Sidebar
.ai-hub__sidebar {
  width: $sidebar-width;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-lg;
  border-bottom: 1px solid var(--border);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.sidebar-logo__icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, $accent-blue, $accent-purple);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.sidebar-logo__text {
  display: flex;
  flex-direction: column;
}

.sidebar-logo__title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--text-primary);
}

.sidebar-logo__subtitle {
  font-size: $font-size-xs;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.theme-btn {
  width: 40px;
  height: 40px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: $radius-md;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  &:hover {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
}

.sidebar-nav {
  flex: 1;
  padding: $spacing-md;
  overflow-y: auto;
}

.nav-label {
  font-size: $font-size-xs;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  padding: $spacing-sm $spacing-md;
  margin-bottom: $spacing-sm;
}

.nav-module {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  width: 100%;
  padding: $spacing-md;
  background: transparent;
  border: 1px solid transparent;
  border-radius: $radius-lg;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all $transition-fast;
  text-align: left;
  margin-bottom: $spacing-xs;

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  &--active {
    background: var(--module-color-light, #{$accent-blue-light});
    border-color: var(--module-color, #{$accent-blue});
    color: var(--text-primary);

    .nav-module__icon {
      background: var(--module-color, #{$accent-blue});
      color: white !important;
    }
  }

  &--coming-soon {
    opacity: 0.7;
  }
}

.nav-module__icon {
  width: 40px;
  height: 40px;
  background: var(--bg-elevated);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;
}

.nav-module__info {
  flex: 1;
  min-width: 0;
}

.nav-module__name {
  display: block;
  font-size: $font-size-sm;
  font-weight: 600;
}

.nav-module__desc {
  display: block;
  font-size: $font-size-xs;
  color: var(--text-muted);
  margin-top: 2px;
}

.nav-module__badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 8px;
  background: $accent-orange-light;
  color: $accent-orange;
  border-radius: $radius-full;
}

.sidebar-footer {
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid var(--border);
}

.model-status {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-xs;
  color: var(--text-muted);

  &--online {
    .model-status__dot {
      background: $accent-green;
      box-shadow: 0 0 8px $accent-green;
    }
  }
}

.model-status__dot {
  width: 8px;
  height: 8px;
  background: $accent-red;
  border-radius: 50%;
}

// Main
.ai-hub__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-lg $spacing-xl;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.module-header__info {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.module-header__icon {
  width: 52px;
  height: 52px;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-header__title {
  font-size: $font-size-xl;
  font-weight: 700;
  margin: 0;
}

.module-header__desc {
  font-size: $font-size-sm;
  color: var(--text-muted);
  margin: 4px 0 0;
}

.module-header__actions {
  display: flex;
  gap: $spacing-sm;
}

.action-btn {
  width: 40px;
  height: 40px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: $radius-md;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  &:hover {
    background: $accent-red-light;
    color: $accent-red;
    border-color: $accent-red;
  }
}

// Messages
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-md 0;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg $spacing-xl;
}

.typing-indicator__avatar {
  width: $message-avatar-size;
  height: $message-avatar-size;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.typing-indicator__dots {
  display: flex;
  gap: 4px;

  span {
    width: 8px;
    height: 8px;
    background: var(--text-muted);
    border-radius: 50%;
    animation: bounce 1.4s infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

// Input
.input-container {
  padding: $spacing-md $spacing-xl $spacing-xl;
  background: var(--bg-primary);
  border-top: 1px solid var(--border);
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  max-width: $message-max-width;
}

.suggestion-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
    color: var(--accent);
  }
}

.input-box {
  display: flex;
  gap: $spacing-md;
  max-width: $message-max-width;
}

.input-field {
  flex: 1;
  padding: $spacing-md $spacing-lg;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: $radius-xl;
  color: var(--text-primary);
  font-size: $font-size-base;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color $transition-fast;

  &:focus {
    border-color: var(--accent);
  }

  &::placeholder {
    color: var(--text-placeholder);
  }
}

.send-btn {
  width: 52px;
  height: 52px;
  border: none;
  border-radius: $radius-lg;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: $shadow-lg;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// File Selector
.file-selector {
  flex: 1;
  padding: $spacing-xl;
  overflow-y: auto;
}

.file-selector__header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  font-size: $font-size-lg;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: $spacing-lg;
}

.file-list {
  display: grid;
  gap: $spacing-md;
  max-width: 800px;
}

.file-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: var(--bg-hover);
    border-color: $accent-green;
    transform: translateX(4px);

    .file-card__arrow {
      color: $accent-green;
      transform: translateX(4px);
    }
  }
}

.file-card__icon {
  width: 48px;
  height: 48px;
  background: $accent-green-light;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $accent-green;
}

.file-card__info {
  flex: 1;
}

.file-card__name {
  display: block;
  font-size: $font-size-base;
  font-weight: 600;
  color: var(--text-primary);
}

.file-card__meta {
  display: block;
  font-size: $font-size-sm;
  color: var(--text-muted);
  margin-top: 4px;
}

.file-card__arrow {
  color: var(--text-muted);
  transition: all $transition-fast;
}

.file-list__empty {
  text-align: center;
  padding: $spacing-2xl;
  color: var(--text-muted);

  p {
    margin: $spacing-md 0;
  }
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-lg;
  background: $accent-green;
  border-radius: $radius-lg;
  color: white;
  text-decoration: none;
  font-weight: 600;
  transition: all $transition-fast;

  &:hover {
    background: darken($accent-green, 10%);
  }
}

.selected-file {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md $spacing-xl;
  background: $accent-green-light;
  border-bottom: 1px solid var(--border);
  font-size: $font-size-sm;
  font-weight: 500;
  color: $accent-green;
}

.selected-file__change {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: $radius-md;
  color: inherit;
  font-size: $font-size-xs;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $accent-green;
    color: white;
  }
}

// Coming Soon
.coming-soon {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-2xl;
  text-align: center;
}

.coming-soon__icon {
  width: 100px;
  height: 100px;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-lg;
}

.coming-soon__title {
  font-size: $font-size-2xl;
  font-weight: 700;
  margin: 0 0 $spacing-sm;
}

.coming-soon__text {
  font-size: $font-size-base;
  color: var(--text-muted);
  margin: 0 0 $spacing-xl;
}

.coming-soon__suggestions {
  max-width: 500px;
}

.coming-soon__label {
  display: block;
  font-size: $font-size-sm;
  color: var(--text-muted);
  margin-bottom: $spacing-md;
}

.coming-soon__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: $spacing-sm;
}

.coming-soon__tag {
  padding: $spacing-sm $spacing-md;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: var(--text-secondary);
}

// Responsive
@media (max-width: $breakpoint-md) {
  .ai-hub__sidebar {
    display: none;
  }
}

// Scrollbar
.messages-container::-webkit-scrollbar,
.sidebar-nav::-webkit-scrollbar,
.file-selector::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track,
.sidebar-nav::-webkit-scrollbar-track,
.file-selector::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb,
.sidebar-nav::-webkit-scrollbar-thumb,
.file-selector::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}
</style>
