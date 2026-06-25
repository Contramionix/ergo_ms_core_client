<script setup>
import { ref, watch, onUnmounted, onMounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { RotateCw, RotateCcw, Check } from 'lucide-vue-next'
import ImageCropper from './ImageCropper.vue'

const toast = useToast()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  imageSrc: {
    type: [String, null],
    default: null
  }
})

const emit = defineEmits(['close', 'confirm', 'cancel'])

const cropperRef = ref(null)
const loading = ref(false)

// Размеры окна для реактивности
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)

// Обновляем размеры окна при resize
function updateWindowSize() {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', updateWindowSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowSize)
  enableBodyScroll()
})

// Вычисляем размер контейнера кроппера — 85% от viewport с ограничениями
const cropperContainerStyle = computed(() => {
  // Доступное пространство (85% viewport минус отступы для UI элементов)
  const availableWidth = windowWidth.value * 0.85 - 48 // padding модалки
  const availableHeight = windowHeight.value * 0.85 - 200 // header, footer, toolbar
  
  // Ограничения
  const maxWidth = 1200
  const maxHeight = 800
  const minHeight = 300
  
  const width = Math.min(availableWidth, maxWidth)
  const height = Math.max(Math.min(availableHeight, maxHeight), minHeight)
  
  return {
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`
  }
})

// Вычисляем ширину модалки
const modalStyle = computed(() => {
  const containerWidth = parseInt(cropperContainerStyle.value.width) || 600
  const modalWidth = containerWidth + 48 // padding
  
  return {
    maxWidth: `${Math.round(modalWidth)}px`,
    width: '100%'
  }
})

// Управление прокруткой страницы
const disableBodyScroll = () => {
  document.body.style.overflow = 'hidden'
}

const enableBodyScroll = () => {
  document.body.style.overflow = ''
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    disableBodyScroll()
  } else {
    enableBodyScroll()
  }
})

// Обработка закрытия
function handleClose() {
  if (!loading.value) {
    emit('close')
    emit('cancel')
  }
}

// Подтверждение кадрирования
async function handleConfirm() {
  if (loading.value || !cropperRef.value) {
    return
  }

  try {
    loading.value = true
    
    // Получаем обрезанный файл
    const croppedFile = await cropperRef.value.getCroppedFile('image/jpeg', 0.9)
    
    if (croppedFile) {
      emit('confirm', croppedFile)
    } else {
      throw new Error('Не удалось обрезать изображение')
    }
  } catch (error) {
    logError('Ошибка при кадрировании:', error)
    toast.error('Ошибка при кадрировании изображения')
  } finally {
    loading.value = false
  }
}

// Поворот по часовой стрелке
function rotateClockwise() {
  if (cropperRef.value) {
    cropperRef.value.rotate(90)
  }
}

// Поворот против часовой стрелки
function rotateCounterClockwise() {
  if (cropperRef.value) {
    cropperRef.value.rotate(-90)
  }
}

// Зеркальное отражение по горизонтали
function flipHorizontal() {
  if (cropperRef.value) {
    cropperRef.value.flip(true)
  }
}

// Сброс
function reset() {
  if (cropperRef.value) {
    cropperRef.value.reset()
  }
}
</script>

<template>
  <div 
    v-if="show" 
    class="modal fade show d-block" 
    tabindex="-1"
    style="background-color: rgba(0, 0, 0, 0.5); z-index: 9999;"
    @click.self="handleClose"
  >
    <div class="modal-dialog modal-dialog-centered avatar-crop-modal" style="z-index: 10000;" :style="modalStyle">
      <div class="modal-content">
        <div class="modal-header border-0 pb-2">
          <h5 class="modal-title mb-0">Кадрирование фотографии</h5>
          <button 
            type="button" 
            class="btn-close" 
            @click="handleClose"
            :disabled="loading"
          ></button>
        </div>
        
        <div class="modal-body">
          <div v-if="imageSrc" class="cropper-wrapper" :style="cropperContainerStyle">
            <ImageCropper
              ref="cropperRef"
              :image-src="imageSrc"
              :aspect-ratio="1"
              :min-width="200"
              :min-height="200"
            />
          </div>
          <div v-else class="text-center py-4 text-muted">
            <p>Изображение не загружено</p>
          </div>
          
          <!-- Панель инструментов -->
          <div class="toolbar mt-3 d-flex flex-wrap gap-2 justify-content-center">
            <button 
              type="button" 
              class="btn btn-sm btn-outline-secondary"
              @click="rotateCounterClockwise"
              :disabled="loading"
              title="Повернуть против часовой стрелки"
            >
              <RotateCcw :size="16" class="me-1" />
              Повернуть
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-outline-secondary"
              @click="rotateClockwise"
              :disabled="loading"
              title="Повернуть по часовой стрелке"
            >
              <RotateCw :size="16" class="me-1" />
              Повернуть
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-outline-secondary"
              @click="flipHorizontal"
              :disabled="loading"
              title="Отразить по горизонтали"
            >
              <span class="me-1">↔</span>
              Отразить
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-outline-secondary"
              @click="reset"
              :disabled="loading"
              title="Сбросить изменения"
            >
              Сбросить
            </button>
          </div>
          
          <div class="text-muted text-center mt-3" style="font-size: 13px">
            Перетащите рамку для выбора области кадрирования. Используйте инструменты для поворота и отражения.
          </div>
        </div>
        
        <div class="modal-footer border-0 pt-2">
          <button 
            type="button" 
            class="btn btn-secondary" 
            @click="handleClose"
            :disabled="loading"
          >
            Отмена
          </button>
          <button 
            type="button" 
            class="btn btn-primary"
            @click="handleConfirm"
            :disabled="loading"
          >
            <span 
              v-if="loading" 
              class="spinner-border spinner-border-sm me-2" 
              role="status"
            ></span>
            <Check v-else :size="16" class="me-1" />
            Применить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 9999 !important;
}

.modal-dialog {
  z-index: 10000 !important;
  position: relative !important;
  width: calc(100% - 2rem);
  transition: max-width 0.2s ease;
  
  @media (max-width: 768px) {
    max-width: 95vw !important;
    width: 95vw;
  }
}

.modal-content {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 10001 !important;
  position: relative !important;
}

.modal-header {
  padding: 1.5rem 1.5rem 0.5rem;
}

.modal-body {
  padding: 1rem 1.5rem;
}

.modal-footer {
  padding: 0.5rem 1.5rem 1.5rem;
}

.cropper-wrapper {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

.toolbar {
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    
    svg {
      vertical-align: middle;
    }
  }
}

.btn {
  border-radius: 8px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  
  svg {
    vertical-align: middle;
  }
}

.btn-close:focus {
  box-shadow: none;
}

// Адаптивность для мобильных устройств
@media (max-width: 576px) {
  .modal-dialog {
    margin: 0.5rem;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .toolbar {
    .btn {
      font-size: 0.875rem;
      padding: 0.375rem 0.75rem;
      
      svg {
        margin-right: 0.25rem !important;
      }
    }
  }
}
</style>
