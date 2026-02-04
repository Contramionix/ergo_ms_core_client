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
@import '../styles/variables';

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
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: white;

  &--user {
    background: linear-gradient(135deg, $neon-blue, darken($neon-blue, 15%));
    
    .avatar-glow {
      background: $neon-blue-light;
    }
  }

  &--assistant {
    background: linear-gradient(135deg, $neon-cyan, $neon-purple);
    
    .avatar-glow {
      background: $neon-cyan-light;
    }
  }
}

.avatar-glow {
  position: absolute;
  inset: -4px;
  border-radius: $radius-lg;
  filter: blur(8px);
  opacity: 0.5;
  z-index: -1;
}

.message-bubble {
  flex: 1;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-lg;
  background: color-mix(in srgb, var(--nc-bg-elevated, #{$dark-bg-elevated}) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--nc-border, #{$dark-border});
  position: relative;

  .neural-chat-message--user & {
    background: linear-gradient(135deg, $neon-blue-light, rgba($neon-blue, 0.05));
    border-color: rgba($neon-blue, 0.3);
  }
}

.message-text {
  line-height: $line-height-base;
  color: var(--nc-text-primary, #{$dark-text-primary});
  word-wrap: break-word;

  :deep(code) {
    background: $neon-cyan-light;
    padding: 0.15em 0.4em;
    border-radius: $radius-sm;
    font-family: $font-family-mono;
    font-size: 0.9em;
    color: $neon-cyan;
  }

  :deep(strong) {
    color: var(--nc-text-primary, white);
    font-weight: $font-weight-semibold;
  }

  :deep(em) {
    color: $neon-purple;
  }
}

.message-code {
  margin-top: $spacing-sm;
  background: var(--nc-bg-base, #{$dark-bg-secondary});
  border-radius: $radius-md;
  overflow: hidden;
  border: 1px solid $neon-cyan-medium;

  &--generating {
    border-color: $neon-purple-light;
    
    .code-label {
      color: $neon-purple;
    }
  }
}

.code-label {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-sm;
  background: $neon-cyan-light;
  border-bottom: 1px solid $dark-border;
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: $neon-cyan;
  text-transform: uppercase;
  letter-spacing: $letter-spacing-wide;
}

.message-code pre {
  margin: 0;
  padding: $spacing-sm;
  overflow-x: auto;
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  line-height: $line-height-base;
  color: $neon-green;
}

.message-table {
  margin-top: $spacing-sm;
  border-radius: $radius-md;
  overflow: hidden;
  border: 1px solid $neon-green-light;
}

.table-scroll {
  max-height: 250px;
  overflow: auto;
}

.message-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;
}

.message-table th,
.message-table td {
  padding: $spacing-sm $spacing-sm;
  text-align: left;
  border-bottom: 1px solid $neon-green-light;
  white-space: nowrap;
}

.message-table th {
  background: $neon-green-light;
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  font-weight: $font-weight-semibold;
  color: $neon-green;
  text-transform: uppercase;
  position: sticky;
  top: 0;
}

.message-table td {
  color: var(--nc-text-primary, #{$dark-text-primary});
}

.table-meta {
  padding: $spacing-sm $spacing-sm;
  font-size: $font-size-xs;
  color: var(--nc-text-muted, #{$dark-text-muted});
  background: $neon-green-light;
  border-top: 1px solid $neon-green-light;
}

.message-error {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: $spacing-sm;
  padding: $spacing-sm $spacing-sm;
  background: $neon-red-light;
  border-radius: $radius-sm;
  font-size: $font-size-sm;
  color: $neon-red;
}

.message-stage {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: $spacing-sm;
  font-size: $font-size-sm;
  color: var(--nc-text-muted, #{$dark-text-muted});
}

.message-time {
  font-family: $font-family-mono;
  font-size: 0.7rem;
  color: var(--nc-text-muted, #{$dark-text-muted});
  margin-top: $spacing-xs;
  padding: 0 $spacing-sm;
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
