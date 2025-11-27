<template>
  <div class="assistant-message" :class="`assistant-message--${message.type}`">
    <div class="assistant-message__content">
      <div v-if="message.type === 'user'" class="assistant-message__avatar user-avatar">
        <User :size="20" />
      </div>
      <div v-else class="assistant-message__avatar assistant-avatar">
        <Bot :size="20" />
      </div>

      <div class="assistant-message__text">
        <div v-if="message.content" class="message-content" v-html="formatMarkdown(message.content)"></div>
        
        <!-- SQL запрос -->
        <div v-if="message.sql" class="message-sql">
          <div class="sql-header">
            <Database :size="14" class="me-1" />
            <span>SQL запрос:</span>
          </div>
          <pre><code>{{ message.sql }}</code></pre>
        </div>

        <!-- Генерация SQL (streaming) -->
        <div v-if="message.sqlGenerating" class="message-sql-generating">
          <div class="sql-header">
            <Loader2 :size="14" class="me-1 spinning" />
            <span>Генерация SQL...</span>
          </div>
          <pre><code>{{ message.sqlGenerating }}</code></pre>
        </div>

        <!-- Таблица данных -->
        <div v-if="message.data && message.data.data && message.data.data.length > 0" class="message-table">
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th v-for="col in message.data.columns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in message.data.data" :key="idx">
                  <td v-for="col in message.data.columns" :key="col">{{ row[col] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-info">
            Показано {{ message.data.data.length }} строк
          </div>
        </div>

        <!-- Ошибка -->
        <div v-if="message.error" class="message-error">
          <AlertCircle :size="16" class="me-1" />
          <span>{{ message.error }}</span>
        </div>

        <!-- Стадия обработки -->
        <div v-if="message.stage && message.streaming" class="message-stage">
          <Loader2 :size="14" class="me-1 spinning" />
          <span>{{ message.stage }}</span>
        </div>
      </div>
    </div>

    <div class="assistant-message__timestamp">
      {{ formatTime(message.timestamp) }}
    </div>
  </div>
</template>

<script setup>
import { Bot, User, Database, Loader2, AlertCircle } from 'lucide-vue-next'

defineProps({
  message: {
    type: Object,
    required: true,
  },
})

const formatMarkdown = (text) => {
  if (!text) return ''
  
  // Простое форматирование markdown
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.assistant-message {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  animation: slideInMessage 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.assistant-message--user {
  align-items: flex-end;
}

.assistant-message--assistant {
  align-items: flex-start;
}

.assistant-message__content {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
  align-items: flex-start;
}

/* В fullscreen режиме сообщения могут быть шире */
:global(.assistant-chat--fullscreen) .assistant-message__content {
  max-width: 100%;
}

.assistant-message--user .assistant-message__content {
  flex-direction: row-reverse;
}

.assistant-message__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  background: linear-gradient(135deg, #0d6efd, #0a58ca);
  color: white;
}

.assistant-avatar {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
}

.assistant-message__text {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
}

.assistant-message--user .assistant-message__text {
  background: linear-gradient(135deg, #0d6efd, #0a58ca);
  color: white;
  border: none;
}

.message-content {
  line-height: 1.5;
  word-wrap: break-word;
}

.message-content :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

.message-sql,
.message-sql-generating {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.sql-header {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #6c757d;
}

.message-sql pre,
.message-sql-generating pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.85rem;
  margin: 0;
}

.message-table {
  margin-top: 0.75rem;
}

.table-responsive {
  max-height: 300px;
  overflow-y: auto;
}

.table-info {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.5rem;
}

.message-error {
  display: flex;
  align-items: center;
  color: #dc3545;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.message-stage {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #6c757d;
  margin-top: 0.5rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.assistant-message__timestamp {
  font-size: 0.7rem;
  color: #6c757d;
  margin-top: 0.25rem;
  padding: 0 0.5rem;
}

@keyframes slideInMessage {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>




