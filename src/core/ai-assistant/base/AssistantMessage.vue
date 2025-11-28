<template>
  <div class="neural-chat-message" :class="`neural-chat-message--${message.type}`">
    <div class="message-row">
      <!-- Avatar -->
      <div class="message-avatar" :class="`message-avatar--${message.type}`">
        <User v-if="message.type === 'user'" :size="18" />
        <Sparkles v-else :size="18" />
        <div class="avatar-glow"></div>
      </div>

      <!-- Content bubble -->
      <div class="message-bubble">
        <!-- Text content -->
        <div v-if="message.content" class="message-text" v-html="formatMarkdown(message.content)"></div>
        
        <!-- SQL query -->
        <div v-if="message.sql" class="message-code">
          <div class="code-label">
            <Terminal :size="12" />
            <span>SQL</span>
          </div>
          <pre><code>{{ message.sql }}</code></pre>
        </div>

        <!-- SQL generating -->
        <div v-if="message.sqlGenerating" class="message-code message-code--generating">
          <div class="code-label">
            <Loader2 :size="12" class="spinning" />
            <span>Генерация...</span>
          </div>
          <pre><code>{{ message.sqlGenerating }}</code></pre>
        </div>

        <!-- Data table -->
        <div v-if="message.data && message.data.data && message.data.data.length > 0" class="message-table">
          <div class="table-scroll">
            <table>
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
          <div class="table-meta">{{ message.data.data.length }} строк</div>
        </div>

        <!-- Error -->
        <div v-if="message.error" class="message-error">
          <AlertCircle :size="14" />
          <span>{{ message.error }}</span>
        </div>

        <!-- Stage -->
        <div v-if="message.stage && message.streaming" class="message-stage">
          <Loader2 :size="12" class="spinning" />
          <span>{{ message.stage }}</span>
        </div>
      </div>
    </div>

    <div class="message-time">{{ formatTime(message.timestamp) }}</div>
  </div>
</template>

<script setup>
import { Sparkles, User, Terminal, Loader2, AlertCircle } from 'lucide-vue-next'

defineProps({
  message: {
    type: Object,
    required: true,
  },
})

const formatMarkdown = (text) => {
  if (!text) return ''
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

<style lang="scss" scoped>
$neon-cyan: #3ae8ff;
$neon-purple: #a855f7;
$neon-blue: #4f8fff;
$neon-red: #ff3366;
$dark-bg: #0a0c12;
$dark-elevated: #13161f;

.neural-chat-message {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  animation: messageSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &--user {
    align-items: flex-end;
    
    .message-row {
      flex-direction: row-reverse;
    }
  }

  &--assistant {
    align-items: flex-start;
  }
}

.message-row {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
  align-items: flex-start;
}

.message-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: white;

  &--user {
    background: linear-gradient(135deg, $neon-blue, darken($neon-blue, 15%));
    
    .avatar-glow {
      background: rgba($neon-blue, 0.3);
    }
  }

  &--assistant {
    background: linear-gradient(135deg, $neon-cyan, $neon-purple);
    
    .avatar-glow {
      background: rgba($neon-cyan, 0.3);
    }
  }
}

.avatar-glow {
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  filter: blur(8px);
  opacity: 0.5;
  z-index: -1;
}

.message-bubble {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: $dark-elevated;
  border: 1px solid rgba($neon-cyan, 0.15);
  position: relative;

  .neural-chat-message--user & {
    background: linear-gradient(135deg, rgba($neon-blue, 0.15), rgba($neon-blue, 0.05));
    border-color: rgba($neon-blue, 0.3);
  }
}

.message-text {
  line-height: 1.6;
  color: #e8ecf4;
  word-wrap: break-word;

  :deep(code) {
    background: rgba($neon-cyan, 0.15);
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9em;
    color: $neon-cyan;
  }

  :deep(strong) {
    color: white;
    font-weight: 600;
  }

  :deep(em) {
    color: $neon-purple;
  }
}

.message-code {
  margin-top: 0.75rem;
  background: $dark-bg;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba($neon-cyan, 0.2);

  &--generating {
    border-color: rgba($neon-purple, 0.3);
    
    .code-label {
      color: $neon-purple;
    }
  }
}

.code-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba($neon-cyan, 0.05);
  border-bottom: 1px solid rgba($neon-cyan, 0.1);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: $neon-cyan;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.message-code pre {
  margin: 0;
  padding: 0.75rem;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #a3e635;
}

.message-table {
  margin-top: 0.75rem;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.table-scroll {
  max-height: 250px;
  overflow: auto;
}

.message-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.message-table th,
.message-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(16, 185, 129, 0.1);
  white-space: nowrap;
}

.message-table th {
  background: rgba(16, 185, 129, 0.1);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: #22ff8d;
  text-transform: uppercase;
  position: sticky;
  top: 0;
}

.message-table td {
  color: #e8ecf4;
}

.table-meta {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: #5a6882;
  background: rgba(16, 185, 129, 0.05);
  border-top: 1px solid rgba(16, 185, 129, 0.1);
}

.message-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba($neon-red, 0.1);
  border-radius: 6px;
  font-size: 0.875rem;
  color: $neon-red;
}

.message-stage {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #5a6882;
}

.message-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: #5a6882;
  margin-top: 0.25rem;
  padding: 0 0.5rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes messageSlide {
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
