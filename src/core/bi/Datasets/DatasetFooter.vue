<template>
  <transition name="slide-footer">
    <div class="footer-wrapper" v-if="isPreviewVisible" :style="{ height: footerHeight + 'px' }">
      <div class="footer-resizer" @mousedown="startResize"></div>
      <footer class="footer-content">
        <template v-if="previewRows && previewRows.length">
          <DatasetTablePreview 
            v-model:limit="previewLimit" 
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
  </transition>
</template>

<script setup>
import { ref, onBeforeUnmount, watch } from 'vue'
import DatasetTablePreview from './components/DatasetTablePreview.vue'

defineProps({
  isPreviewVisible: Boolean,
  previewRows: Array,
  previewCols: Array,
  fields: Array,
  datasetId: [String, Number],
  isPreviewLoading: Boolean,
  connectionStatus: { type: String, default: 'connected' }
})

const emit = defineEmits(['update:previewLimit', 'switch-to-sources'])

const footerHeight = ref(400)
const MIN_HEIGHT = 300
const MAX_HEIGHT = ref(800)

// Лимит строк для предпросмотра берется из .env (VITE_BI_PREVIEW_ROWS_LIMIT)
const previewLimit = ref(parseInt(import.meta.env.VITE_BI_PREVIEW_ROWS_LIMIT || '200', 10))

// Синхронизируем previewLimit с родительским компонентом
watch(previewLimit, (newValue) => {
  emit('update:previewLimit', newValue)
})

const isResizing = ref(false)
let startY = 0
let startHeight = 0

function startResize(e) {
  e.preventDefault()
  e.stopPropagation()
  
  if (isResizing.value) return
  
  isResizing.value = true
  startY = e.clientY
  startHeight = footerHeight.value

  // Вычисляем максимальную высоту на основе доступного пространства
  const layout = document.querySelector('.layout')
  if (layout) {
    const rect = layout.getBoundingClientRect()
    const availableHeight = window.innerHeight - rect.top - 100
    MAX_HEIGHT.value = Math.min(availableHeight, 800)
  } else {
    MAX_HEIGHT.value = Math.floor(window.innerHeight * 0.7)
  }

  // Используем capture phase для надежного отслеживания
  document.addEventListener('mousemove', handleResize, { passive: false })
  document.addEventListener('mouseup', stopResize, { once: true })
  
  // Предотвращаем выделение текста и устанавливаем курсор
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(e) {
  if (!isResizing.value) {
    stopResize()
    return
  }
  
  e.preventDefault()
  e.stopPropagation()
  
  // Вычисляем изменение позиции мыши
  // При движении мыши вверх (e.clientY < startY) высота увеличивается
  // При движении мыши вниз (e.clientY > startY) высота уменьшается
  const deltaY = startY - e.clientY  // Инвертируем для правильного направления
  const newHeight = startHeight + deltaY
  
  // Ограничиваем высоту минимальным и максимальным значениями
  footerHeight.value = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT.value, newHeight))
}

function stopResize() {
  if (!isResizing.value) return
  
  isResizing.value = false
  
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  
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
  grid-area: footer;
  min-height: 300px;
  overflow: hidden;
}

.footer-resizer {
  position: absolute;
  top: -3px;
  left: 0;
  right: 0;
  height: 10px;
  cursor: row-resize;
  z-index: 10001;
  background: transparent;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  touch-action: none;
}

.footer-resizer:hover {
  background: var(--color-border, #dee2e6);
  height: 12px;
  top: -4px;
}

.footer-resizer:active {
  background: var(--color-accent, #e53935);
}

.footer-content {
  position: relative;
  padding: 0.75rem 0 0.75rem 0.75rem;
  padding-top: 8px;
  padding-bottom: 6px;
  background-color: var(--color-header-background);
  border-top: 1px solid var(--color-border);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 300px;
  height: 100%;
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

.slide-footer-enter-active,
.slide-footer-leave-active {
  transition: all 0.3s ease;
}

.slide-footer-enter-from,
.slide-footer-leave-to {
  transform: translateY(100%);
  opacity: 0;
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
