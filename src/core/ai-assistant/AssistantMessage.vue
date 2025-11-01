<template>
  <div class="assistant-message" :class="`assistant-message--${message.type}`">
    <div class="assistant-message__avatar">
      <User v-if="message.type === 'user'" :size="16" />
      <Bot v-else :size="16" />
    </div>

    <div class="assistant-message__content">
      <!-- Индикатор текущей стадии (для streaming) -->
      <div v-if="message.streaming && message.stage" class="assistant-message__stage">
        <div class="stage-indicator">
          <div class="spinner"></div>
          <span>{{ message.stage }}</span>
        </div>
      </div>

      <!-- Генерация SQL (streaming) -->
      <div v-if="message.sqlGenerating" class="assistant-message__sql-generating">
        <div class="sql-header">
          <Code :size="14" />
          <span>Генерирую SQL...</span>
        </div>
        <pre class="sql-code sql-code--generating"><code>{{ message.sqlGenerating }}</code></pre>
      </div>

      <!-- Финальный SQL запрос -->
      <div v-if="message.sql && !message.sqlGenerating" class="assistant-message__sql">
        <div class="sql-header">
          <Database :size="14" />
          <span>SQL Запрос</span>
        </div>
        <pre class="sql-code"><code>{{ message.sql }}</code></pre>
      </div>

      <!-- Основной текст сообщения -->
      <div v-if="message.content" class="assistant-message__text" v-html="formatContent(message.content)"></div>

      <!-- Таблица с данными -->
      <div v-if="message.data && message.data.data && message.data.data.length > 0" class="assistant-message__table">
        <div class="table-header">
          <Table2 :size="14" />
          <span>Результаты ({{ message.data.rows }} строк)</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="col in message.data.columns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in message.data.data.slice(0, 10)" :key="idx">
                <td v-for="col in message.data.columns" :key="col">
                  {{ row[col] !== null && row[col] !== undefined ? row[col] : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="message.data.rows > 10" class="table-more">
            и еще {{ message.data.rows - 10 }} строк...
          </div>
        </div>
      </div>

      <!-- Ошибка -->
      <div v-if="message.error" class="assistant-message__error">
        <AlertCircle :size="16" />
        <span>{{ message.error }}</span>
      </div>

      <!-- Время -->
      <div class="assistant-message__time">
        {{ formatTime(message.timestamp) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { User, Bot, Database, Code, Table2, AlertCircle } from 'lucide-vue-next'

defineProps({
  message: {
    type: Object,
    required: true,
  },
})

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatContent = (content) => {
  if (!content) return ''
  
  // Простая обработка markdown
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}
</script>

<style scoped>
.assistant-message {
  display: flex;
  gap: 12px;
  animation: slideInMessage 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.assistant-message--user {
  flex-direction: row-reverse;
}

.assistant-message__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.assistant-message--user .assistant-message__avatar {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
}

.assistant-message--assistant .assistant-message__avatar {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: white;
}

.assistant-message__content {
  flex: 1;
  max-width: calc(100% - 48px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Stage Indicator */
.assistant-message__stage {
  padding: 8px 12px;
  background: #e7f3ff;
  border-left: 3px solid #0d6efd;
  border-radius: 4px;
  font-size: 13px;
  animation: pulse 2s infinite;
}

.stage-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0d6efd;
  font-weight: 500;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e7f3ff;
  border-top-color: #0d6efd;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* SQL Block */
.assistant-message__sql,
.assistant-message__sql-generating {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sql-header,
.table-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #2d2d2d;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sql-code {
  margin: 0;
  padding: 14px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

.sql-code--generating {
  border-left: 3px solid #ffc107;
  animation: glow 1.5s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% {
    border-color: #ffc107;
  }
  50% {
    border-color: #ff9800;
  }
}

.sql-code code {
  color: #569cd6;
  text-shadow: 0 0 2px rgba(86, 156, 214, 0.3);
}

/* Text Message */
.assistant-message__text {
  padding: 14px 18px;
  word-wrap: break-word;
  line-height: 1.6;
  font-size: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.assistant-message--user .assistant-message__text {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  border-radius: 20px 6px 20px 20px;
}

.assistant-message--assistant .assistant-message__text {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  color: #495057;
  border-radius: 6px 20px 20px 20px;
  border: 1px solid rgba(220, 53, 69, 0.1);
}

.assistant-message__text:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* Table */
.assistant-message__table {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.table-header {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: white;
}

.table-container {
  max-height: 400px;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table thead {
  position: sticky;
  top: 0;
  background: #f8f9fa;
  z-index: 1;
}

.data-table th {
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e9ecef;
  color: #212529;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}

.table-more {
  padding: 10px 12px;
  background: #f8f9fa;
  color: #6c757d;
  font-size: 12px;
  text-align: center;
  font-style: italic;
}

/* Error */
.assistant-message__error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8d7da;
  color: #721c24;
  border-left: 3px solid #dc3545;
  border-radius: 4px;
  font-size: 13px;
}

/* Time */
.assistant-message__time {
  font-size: 12px;
  color: #6c757d;
  padding: 0 6px;
  font-weight: 500;
}

.assistant-message--user .assistant-message__time {
  text-align: right;
}

@keyframes slideInMessage {
  from {
    opacity: 0;
    transform: translateY(15px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 480px) {
  .assistant-message__content {
    max-width: calc(100% - 42px);
  }

  .assistant-message__avatar {
    width: 32px;
    height: 32px;
  }

  .assistant-message__text {
    padding: 12px 16px;
    font-size: 13px;
  }

  .sql-code,
  .data-table {
    font-size: 11px;
  }
}
</style>
