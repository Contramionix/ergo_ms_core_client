<template>
  <div 
    class="footer-wrapper" 
    v-if="isPreviewVisible" 
    :class="{ 'is-resizing': isResizing }"
    :style="{ height: footerHeight + 'px' }"
  >
    <div 
      class="footer-resizer" 
      @mousedown="startResize"
      @touchstart="startResize"
    >
      <div class="resize-indicator"></div>
    </div>
    <footer class="footer-content">
        <template v-if="datasetId || (previewRows && previewRows.length)">
          <DatasetTablePreview 
            :key="previewTableKey"
            :cols="previewCols" 
            :rows="previewRows" 
            :fields="fields"
            :dataset-id="datasetId"
            :is-preview-visible="isPreviewVisible"
          />
          <transition name="fade">
            <div v-if="isPreviewLoading" class="footer-overlay">
              <div class="spinner"></div>
              <span>Загружаем данные…</span>
            </div>
          </transition>
        </template>
        <template v-else>
          <div v-if="connectionStatus === 'error'" class="preview-placeholder error">
            <div class="error-content">
              <div class="error-title">Предпросмотр недоступен</div>
              <div class="error-description">
                Из-за проблем с подключением невозможно загрузить данные для предпросмотра. 
                Сначала исправьте проблемы с подключением на вкладке "Источники".
              </div>
            </div>
            <button class="error-action-btn" @click="$emit('switch-to-sources')">
              Перейти к источникам
            </button>
          </div>
          <div v-else class="preview-placeholder">
            Чтобы увидеть предпросмотр выберите подключение и таблицу, которая ляжет в основу датасета
          </div>
        </template>
      </footer>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, watch, nextTick } from 'vue'
import DatasetTablePreview from './components/DatasetTablePreview.vue'

const props = defineProps({
  isPreviewVisible: Boolean,
  previewRows: Array,
  previewCols: Array,
  fields: Array,
  datasetId: [String, Number],
  isPreviewLoading: Boolean,
  connectionStatus: { type: String, default: 'connected' }
})

const emit = defineEmits(['switch-to-sources'])

// Ключ для перемонтирования таблицы при изменении набора колонок (например, добавление поля с формулой)
const previewTableKey = computed(() => {
  const cols = props.previewCols
  if (!cols || !cols.length) return '0'
  return `${cols.length}-${cols[cols.length - 1] ?? ''}`
})

// Константы
const MIN_HEIGHT = 300
const MAX_HEIGHT = 1000

// Состояние
const footerHeight = ref(400)
const isResizing = ref(false)
const startY = ref(0)
const startHeight = ref(0)

// Лимиты убраны - поле ввода лимита удалено

function startResize(e) {
  const event = e.touches ? e.touches[0] : e
  
  e.preventDefault()
  e.stopPropagation()
  
  if (isResizing.value) return
  
  isResizing.value = true
  startY.value = event.clientY
  startHeight.value = footerHeight.value
  
  // Добавляем слушатели
  if (e.touches) {
    document.addEventListener('touchmove', handleResize, { passive: false })
    document.addEventListener('touchend', stopResize, { once: true })
  } else {
    document.addEventListener('mousemove', handleResize, { passive: false })
    document.addEventListener('mouseup', stopResize, { once: true })
  }
  
  // Блокируем выделение текста
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'row-resize'
}

function handleResize(e) {
  if (!isResizing.value) return
  
  const event = e.touches ? e.touches[0] : e
  e.preventDefault()
  e.stopPropagation()
  
  // Вычисляем новую высоту
  // При движении вверх (clientY уменьшается) - высота увеличивается
  // При движении вниз (clientY увеличивается) - высота уменьшается
  const deltaY = startY.value - event.clientY
  let newHeight = startHeight.value + deltaY
  
  // Ограничиваем высоту
  newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight))
  
  footerHeight.value = newHeight
}

function stopResize() {
  if (!isResizing.value) return
  
  isResizing.value = false
  
  // Удаляем слушатели
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', handleResize)
  document.removeEventListener('touchend', stopResize)
  
  // Восстанавливаем стили
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onBeforeUnmount(() => {
  stopResize()
})
</script>

<style scoped lang="scss">
.footer-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 300px;
  background-color: var(--color-header-background);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  overflow: hidden;
  transition: none;
  will-change: height;
}

.footer-wrapper.is-resizing {
  user-select: none;
  pointer-events: auto;
}

.footer-resizer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
  z-index: 1000;
  background: transparent;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  touch-action: none;
}

.resize-indicator {
  width: 80px;
  height: 5px;
  background: var(--color-border, #dee2e6);
  border-radius: 3px;
  transition: all 0.2s ease;
  pointer-events: none;
}

.footer-resizer:hover .resize-indicator {
  background: var(--color-secondary-text, #999);
  width: 100px;
  height: 6px;
}

.footer-resizer:active .resize-indicator {
  background: var(--color-accent, #e53935);
}

.footer-content {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 32px 0.75rem 0.75rem 0.75rem;
  border-top: 1px solid var(--color-border);
  overflow: hidden;
  min-height: 0;
}

.preview-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-secondary-text);
  font-style: italic;
}

.preview-placeholder.error {
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  text-align: center;
}

.preview-placeholder.error .error-content {
  max-width: 400px;
}

.preview-placeholder.error .error-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 16px;
  font-style: normal;
}

.preview-placeholder.error .error-description {
  font-size: 14px;
  line-height: 1.5;
  font-style: normal;
}

.preview-placeholder.error .error-action-btn {
  background: #c53030;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin: 0 auto;
  display: block;
}

.preview-placeholder.error .error-action-btn:hover {
  background: #9b2c2c;
}

.footer-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: var(--color-primary-background);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  pointer-events: all;
  font-size: 1.1rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 4px solid var(--color-border);
  border-top: 4px solid var(--color-secondary-text);
  border-radius: 50%;
  animation: spin .8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
