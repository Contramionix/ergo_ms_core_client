<template>
  <div 
    class="neural-message" 
    :class="[
      `neural-message--${message.type}`,
      { 'neural-message--streaming': message.streaming }
    ]"
  >
    <!-- Connection line decoration -->
    <div class="message-connector">
      <div class="connector-line"></div>
      <div class="connector-node"></div>
    </div>

    <!-- Avatar -->
    <div class="message-avatar" :style="avatarStyle">
      <div class="avatar-core">
        <User v-if="message.type === 'user'" :size="20" />
        <component v-else :is="moduleIcon" :size="20" />
      </div>
      <div class="avatar-ring"></div>
      <div v-if="message.streaming" class="avatar-pulse"></div>
    </div>

    <!-- Content -->
    <div class="message-body">
      <!-- Header -->
      <div class="message-header">
        <span class="message-author">{{ authorName }}</span>
        <span class="message-time">{{ formattedTime }}</span>
      </div>

      <!-- Text Content -->
      <div class="message-content" v-html="formattedContent"></div>

      <!-- Streaming Cursor -->
      <span v-if="message.streaming" class="streaming-cursor"></span>

      <!-- Stage Indicator -->
      <div v-if="message.stage" class="message-stage">
        <div class="stage-spinner">
          <div class="spinner-ring"></div>
        </div>
        <span>{{ message.stage }}</span>
      </div>

      <!-- SQL Block -->
      <div v-if="message.sql" class="message-code-block">
        <div class="code-header">
          <div class="code-header__left">
            <Terminal :size="14" />
            <span>SQL QUERY</span>
          </div>
          <button class="code-copy" @click="copySql" :title="sqlCopied ? 'Скопировано!' : 'Копировать'">
            <Check v-if="sqlCopied" :size="14" />
            <Copy v-else :size="14" />
          </button>
        </div>
        <div class="code-content">
          <pre><code>{{ message.sql }}</code></pre>
          <div class="code-glow"></div>
        </div>
      </div>

      <!-- Data Table -->
      <div v-if="message.data?.data?.length" class="message-data">
        <div class="data-header">
          <div class="data-header__left">
            <Grid3x3 :size="14" />
            <span>РЕЗУЛЬТАТ</span>
          </div>
          <div class="data-header__right">
            <span class="data-count">{{ message.data.rows }} строк</span>
          </div>
        </div>
        
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="col in message.data.columns" :key="col">
                  <span class="th-content">{{ col }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in message.data.data.slice(0, 15)" :key="idx">
                <td v-for="col in message.data.columns" :key="col">
                  <span class="cell-value">{{ formatCell(row[col]) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-if="message.data.data.length > 15" class="data-more">
          <span>+ ещё {{ message.data.data.length - 15 }} строк</span>
        </div>
      </div>

      <!-- Error -->
      <div v-if="message.error" class="message-error">
        <AlertTriangle :size="16" />
        <span>{{ message.error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { 
  User, Bot, Terminal, Copy, Check, 
  Grid3x3, AlertTriangle, Database
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
  return props.moduleConfig?.color || '#3ae8ff'
})

const avatarStyle = computed(() => {
  if (props.message.type === 'user') {
    return { '--avatar-color': '#4f8fff' }
  }
  return { '--avatar-color': moduleColor.value }
})

const authorName = computed(() => {
  if (props.message.type === 'user') return 'Вы'
  return props.moduleConfig?.name || 'Neural'
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

.neural-message {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-lg $spacing-xl;
  position: relative;
  transition: all $transition-fast;

  &:hover {
    background: rgba(58, 232, 255, 0.02);

    .connector-line {
      opacity: 0.5;
    }

    .connector-node {
      transform: scale(1.2);
      box-shadow: $glow-cyan;
    }
  }

  &--user {
    .message-body {
      background: linear-gradient(135deg, rgba(79, 143, 255, 0.1), rgba(79, 143, 255, 0.05));
      border-color: rgba(79, 143, 255, 0.2);
    }

    .connector-node {
      background: $neon-blue;
    }
  }

  &--assistant {
    .message-body {
      background: linear-gradient(135deg, rgba(58, 232, 255, 0.08), rgba(168, 85, 247, 0.05));
      border-color: rgba(58, 232, 255, 0.15);
    }
  }

  &--streaming {
    .message-content {
      &::after {
        content: '';
        display: inline-block;
        width: 2px;
        height: 1.2em;
        background: var(--accent, #{$neon-cyan});
        margin-left: 4px;
        animation: cursor-blink 1s step-end infinite;
        vertical-align: text-bottom;
      }
    }
  }
}

// Connector decoration
.message-connector {
  position: absolute;
  left: calc(#{$spacing-xl} + 22px);
  top: 0;
  bottom: 0;
  width: 20px;
  pointer-events: none;
}

.connector-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--avatar-color, #{$neon-cyan}),
    transparent
  );
  opacity: 0.2;
  transition: opacity $transition-fast;
}

.connector-node {
  position: absolute;
  left: 50%;
  top: calc(#{$spacing-lg} + 22px);
  width: 8px;
  height: 8px;
  background: var(--avatar-color, #{$neon-cyan});
  border-radius: 50%;
  transform: translateX(-50%);
  transition: all $transition-fast;
}

// Avatar
.message-avatar {
  width: $message-avatar-size;
  height: $message-avatar-size;
  position: relative;
  flex-shrink: 0;
  z-index: 1;
}

.avatar-core {
  position: absolute;
  inset: 4px;
  background: linear-gradient(135deg, var(--avatar-color), rgba(0, 0, 0, 0.5));
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 2;
}

.avatar-ring {
  position: absolute;
  inset: 0;
  border: 2px solid var(--avatar-color);
  border-radius: $radius-md + 2px;
  opacity: 0.5;
}

.avatar-pulse {
  position: absolute;
  inset: -4px;
  border: 1px solid var(--avatar-color);
  border-radius: $radius-lg;
  animation: avatar-pulse 2s ease-out infinite;
}

@keyframes avatar-pulse {
  0% { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(1.2); opacity: 0; }
}

// Body
.message-body {
  flex: 1;
  min-width: 0;
  max-width: $message-max-width;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-lg;
  position: relative;

  // Corner cuts decoration
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    border-style: solid;
    border-color: var(--avatar-color, #{$neon-cyan});
    opacity: 0.3;
  }

  &::before {
    top: -1px;
    left: -1px;
    border-width: 1px 0 0 1px;
    border-radius: $radius-lg 0 0 0;
  }

  &::after {
    bottom: -1px;
    right: -1px;
    border-width: 0 1px 1px 0;
    border-radius: 0 0 $radius-lg 0;
  }
}

.message-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.message-author {
  font-family: $font-family-display;
  font-size: $font-size-sm;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: $letter-spacing-wide;
}

.message-time {
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  color: var(--text-muted);
}

.message-content {
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
    color: var(--accent);
  }

  :deep(code) {
    font-family: $font-family-mono;
    font-size: 0.9em;
    background: rgba(58, 232, 255, 0.1);
    padding: 2px 8px;
    border-radius: $radius-sm;
    color: $neon-cyan;
    border: 1px solid rgba(58, 232, 255, 0.2);
  }
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

// Stage indicator
.message-stage {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: rgba(58, 232, 255, 0.1);
  border: 1px solid rgba(58, 232, 255, 0.2);
  border-radius: $radius-full;
  font-family: $font-family-mono;
  font-size: $font-size-sm;
  color: $neon-cyan;
}

.stage-spinner {
  width: 16px;
  height: 16px;
  position: relative;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: $neon-cyan;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// Code block
.message-code-block {
  margin-top: $spacing-md;
  border-radius: $radius-lg;
  overflow: hidden;
  background: var(--bg-base);
  border: 1px solid rgba(58, 232, 255, 0.2);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm $spacing-md;
  background: rgba(58, 232, 255, 0.05);
  border-bottom: 1px solid rgba(58, 232, 255, 0.1);
}

.code-header__left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $neon-cyan;
  letter-spacing: $letter-spacing-wider;
}

.code-copy {
  padding: $spacing-xs;
  background: transparent;
  border: 1px solid rgba(58, 232, 255, 0.3);
  border-radius: $radius-sm;
  color: $neon-cyan;
  cursor: pointer;
  transition: all $transition-fast;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: $neon-cyan;
    color: $dark-bg-primary;
  }
}

.code-content {
  position: relative;
  padding: $spacing-md;
  overflow-x: auto;

  pre {
    margin: 0;
    font-family: $font-family-mono;
    font-size: $font-size-sm;
    line-height: $line-height-base;
    color: #a3e635;
  }
}

.code-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, rgba(163, 230, 53, 0.05), transparent);
  pointer-events: none;
}

// Data table
.message-data {
  margin-top: $spacing-md;
  border-radius: $radius-lg;
  overflow: hidden;
  border: 1px solid rgba(16, 185, 129, 0.2);
  background: var(--bg-base);
}

.data-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm $spacing-md;
  background: rgba(16, 185, 129, 0.05);
  border-bottom: 1px solid rgba(16, 185, 129, 0.1);
}

.data-header__left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $neon-green;
  letter-spacing: $letter-spacing-wider;
}

.data-count {
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  color: var(--text-muted);
  padding: 2px 8px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: $radius-sm;
}

.data-table-wrapper {
  overflow-x: auto;
  max-height: 300px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $font-size-sm;

  th, td {
    padding: $spacing-sm $spacing-md;
    text-align: left;
    border-bottom: 1px solid rgba(16, 185, 129, 0.1);
    white-space: nowrap;
  }

  th {
    background: rgba(16, 185, 129, 0.05);
    font-family: $font-family-mono;
    font-weight: 600;
    color: $neon-green;
    font-size: $font-size-xs;
    text-transform: uppercase;
    letter-spacing: $letter-spacing-wide;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  td {
    color: var(--text-primary);
  }

  tbody tr {
    transition: background $transition-fast;

    &:hover {
      background: rgba(16, 185, 129, 0.05);
    }
  }
}

.cell-value {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-more {
  padding: $spacing-sm $spacing-md;
  text-align: center;
  font-family: $font-family-mono;
  font-size: $font-size-xs;
  color: var(--text-muted);
  background: rgba(16, 185, 129, 0.02);
  border-top: 1px solid rgba(16, 185, 129, 0.1);
}

// Error
.message-error {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: rgba(255, 51, 102, 0.1);
  border: 1px solid rgba(255, 51, 102, 0.3);
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $neon-red;
}
</style>


