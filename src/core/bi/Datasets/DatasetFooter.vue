<template>
  <transition name="slide-footer">
    <div class="footer-wrapper" v-if="isPreviewVisible">
      <div class="footer-resizer" @mousedown.prevent="startFooterResize"></div>
      <footer class="footer-content" :style="{ height: footerHeight + 'px', position: 'relative' }">
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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
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

const emit = defineEmits(['update:previewLimit', 'switch-to-sources'])

const footerHeight = ref(200)
const footerMin = 200
let footerMax = 400
let isFooterResizing = false
let footerStartY = 0
let footerStartHeight = 0

const previewLimit = ref(10)

// Синхронизируем previewLimit с родительским компонентом
watch(previewLimit, (newValue) => {
  emit('update:previewLimit', newValue)
})

function startFooterResize(e) {
  isFooterResizing = true
  footerStartY = e.clientY
  footerStartHeight = footerHeight.value

  const layout = document.querySelector('.layout')
  const toolbar = document.querySelector('.toolbar')

  if (layout && toolbar) {
    const layoutRect = layout.getBoundingClientRect()
    const toolbarRect = toolbar.getBoundingClientRect()
    footerMax = layoutRect.bottom - toolbarRect.bottom
  } else {
    footerMax = 600
  }

  window.addEventListener('mousemove', resizeFooter)
  window.addEventListener('mouseup', stopFooterResize)
}

function resizeFooter(e) {
  if (!isFooterResizing) return
  
  const delta = e.clientY - footerStartY
  const newHeight = Math.min(
    footerMax,
    Math.max(footerMin, footerStartHeight - delta)
  )
  
  if (newHeight !== footerHeight.value) {
    footerHeight.value = newHeight
  }
}

function stopFooterResize() {
  isFooterResizing = false
  window.removeEventListener('mousemove', resizeFooter)
  window.removeEventListener('mouseup', stopFooterResize)
}

onMounted(() => {
  // Инициализация
})

onBeforeUnmount(() => {
  stopFooterResize()
})
</script>

<style scoped lang="scss">
.footer-wrapper {
  position: relative;
  grid-area: footer;
  overflow: hidden !important;
}

.footer-resizer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 6px;
  cursor: row-resize;
  z-index: 10;
}

.footer-content {
  position: relative;
  padding: 0.75rem 0 0.75rem 0.75rem;
  padding-bottom: 6px !important;
  background-color: var(--color-header-background);
  border-top: 1px solid var(--color-border);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  overflow: hidden;
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
