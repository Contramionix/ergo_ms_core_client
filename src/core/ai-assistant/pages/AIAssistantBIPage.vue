<template>
  <div class="ai-assistant-page">
    <!-- Sidebar -->
    <aside class="ai-sidebar">
      <div class="ai-sidebar__header">
        <router-link to="/ai-assistant" class="back-btn">
          <ArrowLeft :size="18" />
          <span>Назад</span>
        </router-link>
      </div>
      
      <div class="ai-sidebar__files">
        <div class="files-title">Файлы для анализа</div>
        <div 
          v-for="file in files" 
          :key="file.id"
          class="file-item"
          :class="{ active: selectedFile?.id === file.id }"
          @click="selectFile(file)"
        >
          <FileSpreadsheet :size="16" />
          <span>{{ file.name }}</span>
        </div>
        <div v-if="files.length === 0" class="files-empty">
          <p>Нет загруженных файлов</p>
          <router-link to="/bi/connections/new/file" class="upload-link">
            Загрузить файл
          </router-link>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <main class="ai-main">
      <!-- Нет выбранного файла -->
      <div v-if="!selectedFile" class="ai-welcome">
        <div class="ai-welcome__logo">
          <Database :size="48" />
        </div>
        <h1 class="ai-welcome__title">BI Анализ данных</h1>
        <p class="ai-welcome__subtitle">Выберите файл из списка слева для начала анализа</p>
      </div>

      <!-- Чат с выбранным файлом -->
      <template v-else>
        <!-- Header с информацией о файле -->
        <div class="ai-file-header">
          <FileSpreadsheet :size="20" />
          <span>{{ selectedFile.name }}</span>
          <button class="change-file-btn" @click="selectedFile = null">
            Сменить файл
          </button>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="ai-messages">
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
              
              <!-- SQL -->
              <div v-if="message.sql" class="ai-message__sql">
                <div class="sql-header">
                  <Database :size="14" />
                  <span>SQL запрос</span>
                </div>
                <pre><code>{{ message.sql }}</code></pre>
              </div>

              <!-- Таблица данных -->
              <div v-if="message.data?.data?.length" class="ai-message__table">
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th v-for="col in message.data.columns" :key="col">{{ col }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in message.data.data.slice(0, 20)" :key="idx">
                        <td v-for="col in message.data.columns" :key="col">{{ row[col] }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="table-info">
                  Показано {{ Math.min(20, message.data.data.length) }} из {{ message.data.rows }} строк
                </div>
              </div>

              <!-- Stage -->
              <div v-if="message.stage" class="ai-message__stage">
                <Loader2 :size="14" class="spinning" />
                <span>{{ message.stage }}</span>
              </div>
            </div>
          </div>

          <!-- Typing -->
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

        <!-- Input -->
        <div class="ai-input-area">
          <div class="ai-input-wrapper">
            <textarea
              v-model="inputMessage"
              class="ai-input"
              placeholder="Задайте вопрос к данным..."
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
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { Bot, User, Send, Database, FileSpreadsheet, ArrowLeft, Loader2 } from 'lucide-vue-next'
import { biClient } from '../bi/js/bi-client.js'

const messagesContainer = ref(null)
const inputMessage = ref('')
const isTyping = ref(false)
const selectedFile = ref(null)
const files = ref([])

let messageIdCounter = 1

const messages = ref([])

const formatMarkdown = (text) => {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

const autoResize = (e) => {
  nextTick(() => {
    if (e?.target) {
      e.target.style.height = 'auto'
      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
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

const loadFiles = async () => {
  try {
    const result = await biClient.getUserFiles()
    if (result.success) {
      files.value = result.files
    }
  } catch (error) {
    console.error('Ошибка загрузки файлов:', error)
  }
}

const selectFile = (file) => {
  selectedFile.value = file
  messages.value = [{
    id: messageIdCounter++,
    type: 'assistant',
    content: `✅ Файл **${file.name}** выбран для анализа.\n\nПримеры вопросов:\n• "Покажи первые 10 строк"\n• "Какие колонки есть в файле?"\n• "Посчитай среднее значение"\n• "Найди максимум"`,
    timestamp: new Date(),
  }]
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value || !selectedFile.value) return

  const messageText = inputMessage.value.trim()
  
  messages.value.push({
    id: messageIdCounter++,
    type: 'user',
    content: messageText,
    timestamp: new Date(),
  })

  inputMessage.value = ''
  isTyping.value = true
  scrollToBottom()

  const responseMessageId = messageIdCounter++
  
  try {
    await biClient.askQuestionStream(
      selectedFile.value.id,
      messageText,
      true,
      null,
      (event) => {
        let existingMessage = messages.value.find(m => m.id === responseMessageId)
        
        if (!existingMessage) {
          existingMessage = {
            id: responseMessageId,
            type: 'assistant',
            content: '',
            sql: null,
            data: null,
            stage: '',
            timestamp: new Date(),
          }
          messages.value.push(existingMessage)
        }

        switch (event.type) {
          case 'stage':
            existingMessage.stage = event.message || event.text || ''
            break
          case 'sql':
            existingMessage.sql = event.text || ''
            existingMessage.stage = ''
            break
          case 'commentary':
            existingMessage.content += event.text || ''
            break
          case 'complete':
            existingMessage.data = {
              rows: event.rows,
              columns: event.columns,
              data: event.data,
            }
            existingMessage.sql = event.sql || existingMessage.sql
            existingMessage.stage = ''
            break
          case 'error':
            existingMessage.content = `❌ **Ошибка:** ${event.message || event.text}`
            existingMessage.stage = ''
            break
          case 'done':
            existingMessage.stage = ''
            break
        }
        
        scrollToBottom()
      }
    )
  } catch (error) {
    messages.value.push({
      id: messageIdCounter++,
      type: 'assistant',
      content: `❌ **Ошибка:** ${error.message}`,
      timestamp: new Date(),
    })
  } finally {
    isTyping.value = false
    scrollToBottom()
  }
}

onMounted(() => {
  loadFiles()
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
  width: 280px;
  background: #171717;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #2f2f2f;
}

.ai-sidebar__header {
  padding: 12px;
  border-bottom: 1px solid #2f2f2f;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #ececec;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #2f2f2f;
}

.ai-sidebar__files {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.files-title {
  font-size: 12px;
  font-weight: 600;
  color: #8e8e8e;
  padding: 8px 12px;
  text-transform: uppercase;
}

.file-item {
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

.file-item:hover {
  background: #2f2f2f;
}

.file-item.active {
  background: #10a37f;
}

.file-item span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.files-empty {
  padding: 24px 12px;
  text-align: center;
  color: #8e8e8e;
}

.upload-link {
  display: inline-block;
  margin-top: 12px;
  padding: 8px 16px;
  background: #10a37f;
  border-radius: 8px;
  color: white;
  text-decoration: none;
  font-size: 14px;
}

/* Main */
.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* File header */
.ai-file-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: #2f2f2f;
  border-bottom: 1px solid #424242;
  font-size: 14px;
}

.change-file-btn {
  margin-left: auto;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #565656;
  border-radius: 6px;
  color: #ececec;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.change-file-btn:hover {
  background: #424242;
}

/* Welcome */
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
  background: linear-gradient(135deg, #dc3545, #c82333);
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
  margin: 0;
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
  padding: 24px 10%;
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
  background: #dc3545;
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

.ai-message__sql {
  margin-top: 16px;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.sql-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #2d2d2d;
  font-size: 12px;
  color: #8e8e8e;
}

.ai-message__sql pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  font-size: 13px;
  color: #d4d4d4;
}

.ai-message__table {
  margin-top: 16px;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #424242;
}

.table-wrapper table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table-wrapper th,
.table-wrapper td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #424242;
  white-space: nowrap;
}

.table-wrapper th {
  background: #2d2d2d;
  font-weight: 600;
}

.table-wrapper tr:hover td {
  background: #363636;
}

.table-info {
  margin-top: 8px;
  font-size: 12px;
  color: #8e8e8e;
}

.ai-message__stage {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 14px;
  color: #8e8e8e;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Typing */
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

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* Input */
.ai-input-area {
  padding: 16px 10%;
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
}

.ai-input-wrapper:focus-within {
  border-color: #dc3545;
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
  background: #dc3545;
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
  background: #c82333;
}

.ai-send-btn:disabled {
  background: #565656;
  cursor: not-allowed;
}

/* Scrollbar */
.ai-messages::-webkit-scrollbar,
.ai-sidebar__files::-webkit-scrollbar {
  width: 6px;
}

.ai-messages::-webkit-scrollbar-track,
.ai-sidebar__files::-webkit-scrollbar-track {
  background: transparent;
}

.ai-messages::-webkit-scrollbar-thumb,
.ai-sidebar__files::-webkit-scrollbar-thumb {
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
}
</style>

