<template>
  <div class="neural-hub" :class="{ 'neural-hub--light': isLightTheme }">
    <!-- Анимированный нейронный фон -->
    <NeuralBackground 
      :node-count="60" 
      :connection-distance="180"
      :node-color="isLightTheme ? '#0f768a' : '#3ae8ff'"
      :line-color="isLightTheme ? '#0f768a' : '#3ae8ff'"
    />

    <!-- Боковая панель навигации -->
    <aside class="neural-sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <div class="brand-icon__core">
            <Sparkles :size="22" />
          </div>
          <div class="brand-icon__ring"></div>
          <div class="brand-icon__pulse"></div>
        </div>
        <div class="brand-text">
          <span class="brand-title">NEURAL</span>
          <span class="brand-subtitle">ERGO MS</span>
        </div>
      </div>

      <div class="sidebar-controls">
        <button class="ctrl-btn" @click="toggleTheme" :title="isLightTheme ? 'Тёмная тема' : 'Светлая тема'">
          <Sun v-if="isLightTheme" :size="18" />
          <Moon v-else :size="18" />
        </button>
      </div>

      <nav class="sidebar-modules">
        <span class="modules-label">// МОДУЛИ</span>
        
        <button 
          v-for="module in modules" 
          :key="module.id"
          class="module-card"
          :class="{ 
            'module-card--active': activeModule === module.id,
            'module-card--disabled': module.comingSoon 
          }"
          :style="activeModule === module.id ? `--module-accent: ${module.color}` : ''"
          @click="!module.comingSoon && switchModule(module.id)"
        >
          <div class="module-card__indicator"></div>
          <div class="module-card__icon" :style="{ color: module.color }">
            <component :is="module.icon" :size="22" />
          </div>
          <div class="module-card__content">
            <span class="module-card__name">{{ module.name }}</span>
            <span class="module-card__desc">{{ module.description }}</span>
          </div>
          <span v-if="module.comingSoon" class="module-card__badge">DEV</span>
          <ChevronRight v-else :size="16" class="module-card__arrow" />
        </button>
      </nav>

      <div class="sidebar-status">
        <div class="status-indicator" :class="{ 'status-indicator--online': ollamaOnline }">
          <div class="status-dot"></div>
          <Cpu :size="14" />
          <span class="status-text">{{ currentModel }}</span>
        </div>
      </div>
    </aside>

    <!-- Основная область контента -->
    <main class="neural-main">
      <!-- Заголовок модуля -->
      <header class="module-banner" :style="`--banner-color: ${currentModuleConfig?.color}`">
        <div class="banner-decoration">
          <div class="decoration-line"></div>
          <div class="decoration-dot"></div>
        </div>
        
        <div class="banner-content">
          <div class="banner-icon">
            <component :is="currentModuleConfig?.icon" :size="28" />
          </div>
          <div class="banner-info">
            <h1 class="banner-title">{{ currentModuleConfig?.name }}</h1>
            <p class="banner-desc">{{ currentModuleConfig?.description }}</p>
          </div>
        </div>

        <div class="banner-actions">
          <button class="action-btn action-btn--danger" @click="clearHistory" title="Очистить историю">
            <Trash2 :size="18" />
            <span>Очистить</span>
          </button>
        </div>
      </header>

      <!-- Coming Soon State -->
      <div v-if="currentModuleConfig?.comingSoon" class="coming-soon">
        <div class="coming-soon__visual">
          <div class="coming-soon__icon" :style="{ color: currentModuleConfig?.color }">
            <component :is="currentModuleConfig?.icon" :size="64" />
          </div>
          <div class="coming-soon__particles">
            <span v-for="i in 8" :key="i" class="particle"></span>
          </div>
        </div>
        <h2 class="coming-soon__title">В РАЗРАБОТКЕ</h2>
        <p class="coming-soon__text">Модуль "{{ currentModuleConfig?.name }}" скоро будет доступен</p>
        <div class="coming-soon__features">
          <span 
            v-for="s in currentModuleConfig?.suggestions" 
            :key="s" 
            class="feature-chip"
          >
            <Zap :size="12" />
            {{ s }}
          </span>
        </div>
      </div>

      <!-- Chat Module -->
      <template v-else-if="activeModule === 'chat'">
        <div ref="chatMessagesRef" class="messages-area">
          <div class="messages-wrapper">
            <HubMessage 
              v-for="msg in chatHistory" 
              :key="msg.id" 
              :message="msg" 
              :module-config="currentModuleConfig"
            />
            
            <!-- Typing Indicator -->
            <div v-if="chatLoading" class="typing-indicator">
              <div class="typing-avatar" :style="{ background: currentModuleConfig?.color }">
                <component :is="currentModuleConfig?.icon" :size="18" />
              </div>
              <div class="typing-content">
                <div class="typing-text">Генерация ответа</div>
                <div class="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="input-area">
          <!-- Suggestion Chips -->
          <div class="suggestions" v-if="chatHistory.length <= 1">
            <button 
              v-for="s in currentModuleConfig?.suggestions" 
              :key="s" 
              class="suggestion-chip"
              @click="sendChatMessage(s)"
            >
              <Zap :size="14" />
              <span>{{ s }}</span>
            </button>
          </div>

          <!-- Input Container -->
          <div class="input-container">
            <div class="input-decoration">
              <div class="input-corner input-corner--tl"></div>
              <div class="input-corner input-corner--tr"></div>
              <div class="input-corner input-corner--bl"></div>
              <div class="input-corner input-corner--br"></div>
            </div>
            
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
              :style="{ '--btn-color': currentModuleConfig?.color }"
              @click="sendChatMessage()"
              :disabled="!chatInput.trim() || chatLoading"
            >
              <div class="send-btn__bg"></div>
              <Send :size="20" />
            </button>
          </div>
        </div>
      </template>

      <!-- BI Module -->
      <template v-else-if="activeModule === 'bi'">
        <!-- File Selection -->
        <div v-if="!selectedFile" class="file-selector">
          <div class="file-header">
            <Database :size="24" />
            <div>
              <h3>Выберите источник данных</h3>
              <p>Выберите файл для анализа с помощью AI</p>
            </div>
          </div>
          
          <div class="file-grid">
            <div 
              v-for="file in files" 
              :key="file.id"
              class="file-card"
              @click="selectFile(file)"
            >
              <div class="file-card__icon">
                <FileSpreadsheet :size="28" />
              </div>
              <div class="file-card__info">
                <span class="file-card__name">{{ file.name }}</span>
                <span class="file-card__meta">{{ file.original_filename }}</span>
              </div>
              <div class="file-card__action">
                <ArrowRight :size="18" />
              </div>
            </div>

            <div v-if="files.length === 0" class="file-empty">
              <FileQuestion :size="56" />
              <h4>Нет файлов</h4>
              <p>Загрузите файл для начала анализа</p>
              <router-link to="/bi/connections/new/file" class="upload-link">
                <Upload :size="18" />
                <span>Загрузить файл</span>
              </router-link>
            </div>
          </div>
        </div>

        <!-- BI Chat -->
        <template v-else>
          <div class="selected-source">
            <div class="source-info">
              <FileSpreadsheet :size="18" />
              <span>{{ selectedFile.name }}</span>
            </div>
            <button class="source-change" @click="selectedFile = null">
              <X :size="16" />
              <span>Сменить</span>
            </button>
          </div>

          <div ref="biMessagesRef" class="messages-area">
            <div class="messages-wrapper">
              <HubMessage 
                v-for="msg in biHistory" 
                :key="msg.id" 
                :message="msg" 
                :module-config="currentModuleConfig"
              />
              
              <div v-if="biLoading" class="typing-indicator">
                <div class="typing-avatar" :style="{ background: currentModuleConfig?.color }">
                  <component :is="currentModuleConfig?.icon" :size="18" />
                </div>
                <div class="typing-content">
                  <div class="typing-text">Анализ данных</div>
                  <div class="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="input-area">
            <div class="suggestions" v-if="biHistory.length <= 1">
              <button 
                v-for="s in currentModuleConfig?.suggestions" 
                :key="s" 
                class="suggestion-chip"
                @click="sendBIMessage(s)"
              >
                <Zap :size="14" />
                <span>{{ s }}</span>
              </button>
            </div>

            <div class="input-container">
              <div class="input-decoration">
                <div class="input-corner input-corner--tl"></div>
                <div class="input-corner input-corner--tr"></div>
                <div class="input-corner input-corner--bl"></div>
                <div class="input-corner input-corner--br"></div>
              </div>
              
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
                :style="{ '--btn-color': currentModuleConfig?.color }"
                @click="sendBIMessage()"
                :disabled="!biInput.trim() || biLoading"
              >
                <div class="send-btn__bg"></div>
                <Send :size="20" />
              </button>
            </div>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { 
  Sparkles, Sun, Moon, Cpu, Trash2, Send, Zap, ChevronRight, ArrowRight,
  Database, FileSpreadsheet, FileQuestion, Upload, X
} from 'lucide-vue-next'
import { modules, getModuleById } from '../modules/index.js'
import NeuralBackground from '../components/NeuralBackground.vue'
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
  chatStreamingMsgId = null
  scrollToBottom(chatMessagesRef)

  try {
    await ragClient.sendMessageStream(
      messageText,
      (chunk) => {
        if (!chatStreamingMsgId) {
          chatStreamingMsgId = chatMsgId++
          chatHistory.value.push({
            id: chatStreamingMsgId,
            type: 'assistant',
            content: chunk,
            timestamp: new Date(),
            streaming: true,
          })
          chatLoading.value = false
        } else {
          const msg = chatHistory.value.find(m => m.id === chatStreamingMsgId)
          if (msg) {
            msg.content += chunk
          }
        }
        scrollToBottom(chatMessagesRef)
      },
      (fullResponse) => {
        if (chatStreamingMsgId) {
          const msg = chatHistory.value.find(m => m.id === chatStreamingMsgId)
          if (msg) {
            if (fullResponse) msg.content = fullResponse
            msg.streaming = false
          }
        } else if (fullResponse) {
          chatHistory.value.push({
            id: chatMsgId++,
            type: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          })
        }
        chatLoading.value = false
        chatStreamingMsgId = null
        scrollToBottom(chatMessagesRef)
      },
      (errorMsg) => {
        if (chatStreamingMsgId) {
          const msg = chatHistory.value.find(m => m.id === chatStreamingMsgId)
          if (msg) {
            msg.content += `\n\nОшибка: ${errorMsg}`
            msg.streaming = false
          }
        } else {
          chatHistory.value.push({
            id: chatMsgId++,
            type: 'assistant',
            content: `Ошибка: ${errorMsg}`,
            timestamp: new Date(),
          })
        }
        chatLoading.value = false
        chatStreamingMsgId = null
        scrollToBottom(chatMessagesRef)
      }
    )
  } catch (e) {
    if (chatStreamingMsgId) {
      const msg = chatHistory.value.find(m => m.id === chatStreamingMsgId)
      if (msg) {
        msg.content += `\n\nОшибка: ${e.message}`
        msg.streaming = false
      }
    } else {
      chatHistory.value.push({
        id: chatMsgId++,
        type: 'assistant',
        content: `Ошибка: ${e.message}`,
        timestamp: new Date(),
      })
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
          streaming: true,
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
          msg.streaming = false
          break
        case 'error':
          msg.content = `Ошибка: ${event.message || event.text}`
          msg.stage = ''
          msg.streaming = false
          break
        case 'done':
          msg.stage = ''
          msg.streaming = false
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

// Импорт шрифтов
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Rajdhani:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.neural-hub {
  --bg-base: #{$dark-bg-primary};
  --bg-panel: #{$dark-bg-secondary};
  --bg-elevated: #{$dark-bg-elevated};
  --bg-hover: #{$dark-bg-hover};
  --border-subtle: #{$dark-border};
  --border-accent: #{$dark-border-accent};
  --text-primary: #{$dark-text-primary};
  --text-secondary: #{$dark-text-secondary};
  --text-muted: #{$dark-text-muted};
  --text-placeholder: #{$dark-text-placeholder};
  --accent: #{$neon-cyan};
  --accent-glow: #{$neon-cyan-glow};

  display: flex;
  height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: $font-family-base;
  position: relative;
  overflow: hidden;

  &--light {
    --bg-base: #{$light-bg-primary};
    --bg-panel: #{$light-bg-secondary};
    --bg-elevated: #{$light-bg-elevated};
    --bg-hover: #{$light-bg-hover};
    --border-subtle: #{$light-border};
    --border-accent: rgba(15, 118, 138, 0.3);
    --text-primary: #{$light-text-primary};
    --text-secondary: #{$light-text-secondary};
    --text-muted: #{$light-text-muted};
    --text-placeholder: #{$light-text-placeholder};
    --accent: #0f768a;
    --accent-glow: #0a5f6e;
  }
}

// === SIDEBAR ===
.neural-sidebar {
  width: $sidebar-width;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
  backdrop-filter: blur(20px);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg;
  border-bottom: 1px solid var(--border-subtle);
}

.brand-icon {
  position: relative;
  width: 48px;
  height: 48px;
}

.brand-icon__core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, $neon-cyan, $neon-purple);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 2;
}

.brand-icon__ring {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid $neon-cyan;
  border-radius: 14px;
  opacity: 0.5;
  animation: ring-rotate 10s linear infinite;
}

.brand-icon__pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  border: 1px solid $neon-cyan;
  border-radius: 14px;
  opacity: 0;
  animation: pulse-out 2s ease-out infinite;
}

@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse-out {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-family: $font-family-display;
  font-size: $font-size-xl;
  font-weight: 700;
  letter-spacing: $letter-spacing-wider;
  background: linear-gradient(90deg, $neon-cyan, $neon-purple);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: $font-size-xs;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: $letter-spacing-widest;
  text-transform: uppercase;
}

.sidebar-controls {
  position: absolute;
  top: $spacing-lg;
  right: $spacing-lg;
}

.ctrl-btn {
  width: 36px;
  height: 36px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
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
    box-shadow: $glow-cyan;
  }
}

.sidebar-modules {
  flex: 1;
  padding: $spacing-md;
  overflow-y: auto;
}

.modules-label {
  display: block;
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  color: var(--text-muted);
  padding: $spacing-sm $spacing-md;
  margin-bottom: $spacing-sm;
}

.module-card {
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
  position: relative;
  overflow: hidden;

  &__indicator {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: var(--module-accent, var(--accent));
    border-radius: 0 2px 2px 0;
    transition: height $transition-fast;
  }

  &:hover {
    background: var(--bg-hover);
    border-color: var(--border-subtle);
    
    .module-card__indicator {
      height: 50%;
    }
    
    .module-card__arrow {
      transform: translateX(4px);
      opacity: 1;
    }
  }

  &--active {
    background: rgba(58, 232, 255, 0.08);
    border-color: var(--module-accent, var(--accent));
    
    .module-card__indicator {
      height: 70%;
      box-shadow: 0 0 10px var(--module-accent, var(--accent));
    }
    
    .module-card__icon {
      transform: scale(1.1);
    }
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.module-card__icon {
  width: 44px;
  height: 44px;
  background: var(--bg-elevated);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;
}

.module-card__content {
  flex: 1;
  min-width: 0;
}

.module-card__name {
  display: block;
  font-size: $font-size-sm;
  font-weight: 600;
  color: var(--text-primary);
}

.module-card__desc {
  display: block;
  font-size: $font-size-xs;
  color: var(--text-muted);
  margin-top: 2px;
}

.module-card__badge {
  font-family: $font-family-mono;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  background: $neon-orange-light;
  color: $neon-orange;
  border-radius: $radius-sm;
  letter-spacing: $letter-spacing-wide;
}

.module-card__arrow {
  color: var(--text-muted);
  opacity: 0;
  transition: all $transition-fast;
}

.sidebar-status {
  padding: $spacing-md $spacing-lg;
  border-top: 1px solid var(--border-subtle);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-xs;
  color: var(--text-muted);
  font-family: $font-family-mono;

  &--online {
    .status-dot {
      background: $neon-green;
      box-shadow: 0 0 10px $neon-green;
    }
    .status-text {
      color: $neon-green;
    }
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  background: $neon-red;
  border-radius: 50%;
  animation: status-pulse 2s ease-in-out infinite;
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// === MAIN AREA ===
.neural-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.module-banner {
  display: flex;
  align-items: center;
  padding: $spacing-lg $spacing-xl;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
  backdrop-filter: blur(20px);
}

.banner-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  overflow: hidden;
  
  .decoration-line {
    position: absolute;
    top: 0;
    left: 0;
    width: 200px;
    height: 100%;
    background: linear-gradient(90deg, transparent, var(--banner-color, var(--accent)), transparent);
    animation: scan-line 4s linear infinite;
  }
  
  .decoration-dot {
    position: absolute;
    top: -2px;
    width: 6px;
    height: 6px;
    background: var(--banner-color, var(--accent));
    border-radius: 50%;
    box-shadow: 0 0 10px var(--banner-color, var(--accent));
    animation: scan-dot 4s linear infinite;
  }
}

@keyframes scan-line {
  0% { left: -200px; }
  100% { left: 100%; }
}

@keyframes scan-dot {
  0% { left: -6px; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}

.banner-content {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  flex: 1;
}

.banner-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--banner-color, var(--accent)), rgba(var(--banner-color, var(--accent)), 0.5));
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, var(--banner-color, var(--accent)), transparent);
    border-radius: inherit;
    opacity: 0.3;
    z-index: -1;
  }
}

.banner-title {
  font-family: $font-family-display;
  font-size: $font-size-xl;
  font-weight: 700;
  letter-spacing: $letter-spacing-wide;
  margin: 0;
}

.banner-desc {
  font-size: $font-size-sm;
  color: var(--text-muted);
  margin: 4px 0 0;
}

.banner-actions {
  display: flex;
  gap: $spacing-sm;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: $radius-md;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  &--danger:hover {
    background: $neon-red-light;
    border-color: $neon-red;
    color: $neon-red;
  }
}

// === MESSAGES ===
.messages-area {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.messages-wrapper {
  max-width: calc(#{$message-max-width} + #{$spacing-xl} * 2);
  margin: 0 auto;
  padding: $spacing-md 0;
}

.typing-indicator {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
  padding: $spacing-lg $spacing-xl;
}

.typing-avatar {
  width: $message-avatar-size;
  height: $message-avatar-size;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.typing-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.typing-text {
  font-size: $font-size-sm;
  color: var(--text-muted);
  font-family: $font-family-mono;
}

.typing-dots {
  display: flex;
  gap: 6px;

  span {
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
    animation: typing-bounce 1.4s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes typing-bounce {
  0%, 60%, 100% { 
    transform: translateY(0); 
    opacity: 0.4;
  }
  30% { 
    transform: translateY(-8px); 
    opacity: 1;
  }
}

// === INPUT AREA ===
.input-area {
  padding: $spacing-md $spacing-xl $spacing-xl;
  background: linear-gradient(to top, var(--bg-panel), transparent);
  position: relative;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  max-width: $message-max-width;
}

.suggestion-chip {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: rgba(58, 232, 255, 0.1);
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(-2px);
  }
}

.input-container {
  display: flex;
  gap: $spacing-md;
  max-width: $message-max-width;
  position: relative;
}

.input-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.input-corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border-color: var(--accent);
  border-style: solid;
  opacity: 0.5;
  transition: opacity $transition-fast;

  &--tl {
    top: 0;
    left: 0;
    border-width: 2px 0 0 2px;
    border-radius: 4px 0 0 0;
  }
  &--tr {
    top: 0;
    right: 60px;
    border-width: 2px 2px 0 0;
    border-radius: 0 4px 0 0;
  }
  &--bl {
    bottom: 0;
    left: 0;
    border-width: 0 0 2px 2px;
    border-radius: 0 0 0 4px;
  }
  &--br {
    bottom: 0;
    right: 60px;
    border-width: 0 2px 2px 0;
    border-radius: 0 0 4px 0;
  }
}

.input-container:focus-within .input-corner {
  opacity: 1;
}

.input-field {
  flex: 1;
  padding: $spacing-md $spacing-lg;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: $radius-lg;
  color: var(--text-primary);
  font-size: $font-size-base;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all $transition-fast;

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(58, 232, 255, 0.1);
  }

  &::placeholder {
    color: var(--text-placeholder);
  }
}

.send-btn {
  width: 52px;
  height: 52px;
  background: transparent;
  border: none;
  border-radius: $radius-lg;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: transform $transition-fast;

  &__bg {
    position: absolute;
    inset: 0;
    background: var(--btn-color, var(--accent));
    border-radius: inherit;
    transition: all $transition-fast;
  }

  svg {
    position: relative;
    z-index: 1;
  }

  &:hover:not(:disabled) {
    transform: scale(1.05);
    
    .send-btn__bg {
      box-shadow: $glow-cyan;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// === FILE SELECTOR ===
.file-selector {
  flex: 1;
  padding: $spacing-xl;
  overflow-y: auto;
}

.file-header {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-xl;
  color: var(--accent);
  
  h3 {
    font-family: $font-family-display;
    font-size: $font-size-lg;
    margin: 0;
    color: var(--text-primary);
  }
  
  p {
    font-size: $font-size-sm;
    color: var(--text-muted);
    margin: 4px 0 0;
  }
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-md;
}

.file-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $neon-green;
    transform: translateY(-2px);
    box-shadow: $glow-green;

    .file-card__action {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.file-card__icon {
  width: 52px;
  height: 52px;
  background: $neon-green-light;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $neon-green;
}

.file-card__info {
  flex: 1;
  min-width: 0;
}

.file-card__name {
  display: block;
  font-size: $font-size-base;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-card__meta {
  display: block;
  font-size: $font-size-sm;
  color: var(--text-muted);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-card__action {
  color: $neon-green;
  opacity: 0;
  transform: translateX(-8px);
  transition: all $transition-fast;
}

.file-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: $spacing-2xl;
  color: var(--text-muted);

  h4 {
    font-size: $font-size-lg;
    margin: $spacing-md 0 $spacing-xs;
    color: var(--text-secondary);
  }

  p {
    margin: 0 0 $spacing-lg;
  }
}

.upload-link {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-lg;
  background: $neon-green;
  border-radius: $radius-lg;
  color: white;
  text-decoration: none;
  font-weight: 600;
  transition: all $transition-fast;

  &:hover {
    box-shadow: $glow-green;
    transform: translateY(-2px);
  }
}

.selected-source {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-xl;
  background: $neon-green-light;
  border-bottom: 1px solid rgba($neon-green, 0.3);
}

.source-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $neon-green;
}

.source-change {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  background: transparent;
  border: 1px solid $neon-green;
  border-radius: $radius-md;
  color: $neon-green;
  font-size: $font-size-xs;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $neon-green;
    color: white;
  }
}

// === COMING SOON ===
.coming-soon {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-2xl;
  text-align: center;
}

.coming-soon__visual {
  position: relative;
  margin-bottom: $spacing-xl;
}

.coming-soon__icon {
  width: 120px;
  height: 120px;
  background: var(--bg-elevated);
  border-radius: $radius-2xl;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.coming-soon__particles {
  position: absolute;
  inset: -20px;

  .particle {
    position: absolute;
    width: 6px;
    height: 6px;
    background: var(--accent);
    border-radius: 50%;
    animation: particle-float 3s ease-in-out infinite;
    
    @for $i from 1 through 8 {
      &:nth-child(#{$i}) {
        top: random(100) * 1%;
        left: random(100) * 1%;
        animation-delay: $i * 0.2s;
        animation-duration: 2s + random(20) * 0.1s;
      }
    }
  }
}

@keyframes particle-float {
  0%, 100% { 
    transform: translateY(0) scale(1); 
    opacity: 0.3;
  }
  50% { 
    transform: translateY(-15px) scale(1.2); 
    opacity: 1;
  }
}

.coming-soon__title {
  font-family: $font-family-display;
  font-size: $font-size-2xl;
  font-weight: 700;
  letter-spacing: $letter-spacing-wider;
  margin: 0 0 $spacing-sm;
  color: var(--accent);
}

.coming-soon__text {
  font-size: $font-size-base;
  color: var(--text-muted);
  margin: 0 0 $spacing-xl;
}

.coming-soon__features {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: $spacing-sm;
  max-width: 500px;
}

.feature-chip {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: var(--text-secondary);
}

// === SCROLLBAR ===
.messages-area::-webkit-scrollbar,
.sidebar-modules::-webkit-scrollbar,
.file-selector::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track,
.sidebar-modules::-webkit-scrollbar-track,
.file-selector::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb,
.sidebar-modules::-webkit-scrollbar-thumb,
.file-selector::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 3px;

  &:hover {
    background: var(--accent);
  }
}

// === RESPONSIVE ===
@media (max-width: $breakpoint-md) {
  .neural-sidebar {
    display: none;
  }

  .input-area {
    padding: $spacing-md;
  }

  .module-banner {
    padding: $spacing-md;
  }

  .banner-icon {
    width: 44px;
    height: 44px;
  }

  .banner-title {
    font-size: $font-size-lg;
  }
}
</style>
