<template>
  <div 
    class="hub-message" 
    :class="[
      `hub-message--${message.type}`,
      { 'hub-message--streaming': message.streaming }
    ]"
  >
    <!-- Avatar -->
    <div class="hub-message__avatar" :style="avatarStyle">
      <User v-if="message.type === 'user'" :size="20" />
      <component v-else :is="moduleIcon" :size="20" />
    </div>

    <!-- Content -->
    <div class="hub-message__body">
      <!-- Header -->
      <div class="hub-message__header">
        <span class="hub-message__author">{{ authorName }}</span>
        <span class="hub-message__time">{{ formattedTime }}</span>
      </div>

      <!-- Text Content -->
      <div 
        class="hub-message__content"
        v-html="formattedContent"
      ></div>

      <!-- Stage Indicator -->
      <div v-if="message.stage" class="hub-message__stage">
        <Loader2 :size="16" class="hub-message__stage-icon" />
        <span>{{ message.stage }}</span>
      </div>

      <!-- SQL Block -->
      <div v-if="message.sql" class="hub-message__sql">
        <div class="hub-message__sql-header">
          <Database :size="14" />
          <span>SQL запрос</span>
          <button class="hub-message__copy-btn" @click="copySql" :title="sqlCopied ? 'Скопировано!' : 'Копировать'">
            <Check v-if="sqlCopied" :size="14" />
            <Copy v-else :size="14" />
          </button>
        </div>
        <pre class="hub-message__sql-code"><code>{{ message.sql }}</code></pre>
      </div>

      <!-- Data Table -->
      <div v-if="message.data?.data?.length" class="hub-message__table-wrapper">
        <div class="hub-message__table-header">
          <Table2 :size="14" />
          <span>Результат: {{ message.data.rows }} строк</span>
        </div>
        <div class="hub-message__table-scroll">
          <table class="hub-message__table">
            <thead>
              <tr>
                <th v-for="col in message.data.columns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in message.data.data.slice(0, 15)" :key="idx">
                <td v-for="col in message.data.columns" :key="col">
                  <span class="hub-message__cell">{{ formatCell(row[col]) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="message.data.data.length > 15" class="hub-message__table-more">
          + ещё {{ message.data.data.length - 15 }} строк
        </div>
      </div>

      <!-- Error -->
      <div v-if="message.error" class="hub-message__error">
        <AlertCircle :size="16" />
        <span>{{ message.error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { 
  User, Bot, Database, Loader2, Copy, Check, 
  Table2, AlertCircle, Code, FileText, MessageSquare 
} from 'lucide-vue-next'

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  moduleConfig: {
    type: Object,
    default: null,
  },
})

const sqlCopied = ref(false)

const moduleIcon = computed(() => {
  if (props.moduleConfig?.icon) return props.moduleConfig.icon
  return Bot
})

const moduleColor = computed(() => {
  return props.moduleConfig?.color || '#3b82f6'
})

const avatarStyle = computed(() => {
  if (props.message.type === 'user') {
    return { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }
  }
  return { 
    background: `linear-gradient(135deg, ${moduleColor.value}, ${moduleColor.value}dd)` 
  }
})

const authorName = computed(() => {
  if (props.message.type === 'user') return 'Вы'
  return props.moduleConfig?.name || 'AI Ассистент'
})

const formattedTime = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
})

const formattedContent = computed(() => {
  if (!props.message.content) return ''
  return props.message.content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
})

const formatCell = (value) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : value.toFixed(2)
  }
  const str = String(value)
  return str.length > 50 ? str.slice(0, 47) + '...' : str
}

const copySql = async () => {
  if (!props.message.sql) return
  try {
    await navigator.clipboard.writeText(props.message.sql)
    sqlCopied.value = true
    setTimeout(() => { sqlCopied.value = false }, 2000)
  } catch (err) {
    console.error('Не удалось скопировать:', err)
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/variables';

.hub-message {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-lg $spacing-xl;
  transition: background $transition-fast;

  &:hover {
    background: var(--bg-hover);
  }

  &--user {
    .hub-message__content {
      color: var(--text-primary);
    }
  }

  &--assistant {
    background: var(--bg-tertiary);

    &:hover {
      background: var(--bg-elevated);
    }
  }

  &--streaming {
    .hub-message__content {
      &::after {
        content: '▋';
        animation: blink 1s infinite;
        color: var(--accent);
      }
    }
  }
}

.hub-message__avatar {
  width: $message-avatar-size;
  height: $message-avatar-size;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: $shadow-md;
}

.hub-message__body {
  flex: 1;
  min-width: 0;
  max-width: $message-max-width;
}

.hub-message__header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-xs;
}

.hub-message__author {
  font-size: $font-size-sm;
  font-weight: 600;
  color: var(--text-primary);
}

.hub-message__time {
  font-size: $font-size-xs;
  color: var(--text-muted);
}

.hub-message__content {
  font-size: $message-font-size;
  line-height: $line-height-relaxed;
  color: var(--text-secondary);
  word-wrap: break-word;

  :deep(strong) {
    font-weight: 600;
    color: var(--text-primary);
  }

  :deep(em) {
    font-style: italic;
  }

  :deep(code) {
    font-family: $font-family-mono;
    font-size: 0.9em;
    background: var(--bg-elevated);
    padding: 2px 6px;
    border-radius: $radius-sm;
    color: var(--accent);
  }
}

.hub-message__stage {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: var(--accent-light);
  border-radius: $radius-full;
  font-size: $font-size-sm;
  color: var(--accent);
}

.hub-message__stage-icon {
  animation: spin 1s linear infinite;
}

.hub-message__sql {
  margin-top: $spacing-md;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: $radius-lg;
  overflow: hidden;
}

.hub-message__sql-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-elevated);
  font-size: $font-size-xs;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.hub-message__copy-btn {
  margin-left: auto;
  padding: $spacing-xs;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: $radius-sm;
  transition: all $transition-fast;

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
}

.hub-message__sql-code {
  margin: 0;
  padding: $spacing-md;
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  line-height: $line-height-base;
  color: #a3e635;
  overflow-x: auto;

  code {
    background: none;
    padding: 0;
  }
}

.hub-message__table-wrapper {
  margin-top: $spacing-md;
  border: 1px solid var(--border);
  border-radius: $radius-lg;
  overflow: hidden;
}

.hub-message__table-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-elevated);
  font-size: $font-size-xs;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.hub-message__table-scroll {
  overflow-x: auto;
}

.hub-message__table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;

  th, td {
    padding: $spacing-sm $spacing-md;
    text-align: left;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  th {
    background: var(--bg-tertiary);
    font-weight: 600;
    color: var(--text-secondary);
    position: sticky;
    top: 0;
  }

  td {
    color: var(--text-primary);
  }

  tbody tr:hover td {
    background: var(--bg-hover);
  }
}

.hub-message__cell {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hub-message__table-more {
  padding: $spacing-sm $spacing-md;
  text-align: center;
  font-size: $font-size-xs;
  color: var(--text-muted);
  background: var(--bg-tertiary);
}

.hub-message__error {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: $accent-red-light;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $accent-red;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>

