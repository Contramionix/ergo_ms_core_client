<script setup>
import { ref, onUnmounted, onMounted, computed, defineAsyncComponent } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import { RotateCw, RotateCcw, Check } from '@lucide/vue'
import ModalCenter from './ModalCenter.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const ImageCropper = defineAsyncComponent(() => import('./ImageCropper.vue'))

const { t } = useAppI18n()
const toast = useToast()

defineProps({
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

const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)

function updateWindowSize() {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', updateWindowSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowSize)
})

const cropperContainerStyle = computed(() => {
  const availableWidth = windowWidth.value * 0.85 - 48
  const availableHeight = windowHeight.value * 0.85 - 200

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

const modalStyle = computed(() => {
  const containerWidth = parseInt(cropperContainerStyle.value.width) || 600
  const modalWidth = containerWidth + 48

  return {
    maxWidth: `${Math.round(modalWidth)}px`,
    width: '100%'
  }
})

function handleClose() {
  if (!loading.value) {
    emit('close')
    emit('cancel')
  }
}

async function handleConfirm() {
  if (loading.value || !cropperRef.value) {
    return
  }

  try {
    loading.value = true

    const croppedFile = await cropperRef.value.getCroppedFile('image/jpeg', 0.9)

    if (croppedFile) {
      emit('confirm', croppedFile)
    } else {
      throw new Error(t('components.avatarCrop.cropFailed'))
    }
  } catch (error) {
    logError('Ошибка при кадрировании:', error)
    toast.error(t('components.avatarCrop.cropError'))
  } finally {
    loading.value = false
  }
}

function rotateClockwise() {
  if (cropperRef.value) {
    cropperRef.value.rotate(90)
  }
}

function rotateCounterClockwise() {
  if (cropperRef.value) {
    cropperRef.value.rotate(-90)
  }
}

function flipHorizontal() {
  if (cropperRef.value) {
    cropperRef.value.flip(true)
  }
}

function reset() {
  if (cropperRef.value) {
    cropperRef.value.reset()
  }
}
</script>

<template>
  <ModalCenter
    standalone
    modal-id="avatarCropModal"
    :title="t('components.avatarCrop.title')"
    :visible="show"
    :dialog-style="modalStyle"
    custom-class="avatar-crop-modal"
    @close="handleClose"
  >
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
      <p>{{ t('components.avatarCrop.empty') }}</p>
    </div>

    <div class="toolbar mt-3 d-flex flex-wrap gap-2 justify-content-center">
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="rotateCounterClockwise" :disabled="loading" :title="t('components.avatarCrop.rotateCcw')" :aria-label="t('components.avatarCrop.rotateCcw')">
        <RotateCcw :size="16" class="me-1" aria-hidden="true" />
        {{ t('components.avatarCrop.rotate') }}
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="rotateClockwise" :disabled="loading" :title="t('components.avatarCrop.rotateCw')" :aria-label="t('components.avatarCrop.rotateCw')">
        <RotateCw :size="16" class="me-1" aria-hidden="true" />
        {{ t('components.avatarCrop.rotate') }}
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="flipHorizontal" :disabled="loading" :title="t('components.avatarCrop.flipHorizontal')" :aria-label="t('components.avatarCrop.flipHorizontal')">
        <span class="me-1" aria-hidden="true">↔</span>
        {{ t('components.avatarCrop.flip') }}
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="reset" :disabled="loading" :title="t('components.avatarCrop.resetChanges')" :aria-label="t('components.avatarCrop.resetChanges')">
        {{ t('components.avatarCrop.reset') }}
      </button>
    </div>

    <div class="text-muted text-center mt-3" style="font-size: 13px">
      {{ t('components.avatarCrop.hint') }}
    </div>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" @click="handleClose" :disabled="loading">
        {{ t('common.cancel') }}
      </button>
      <button type="button" class="ui-btn ui-btn--primary" @click="handleConfirm" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
        <Check v-else :size="16" class="me-1" />
        {{ t('common.apply') }}
      </button>
    </template>
  </ModalCenter>
</template>

<style scoped lang="scss">
.cropper-wrapper {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--color-secondary-background);
  border: 1px solid var(--color-border);
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

@media (width < $ui-bp-sm) {
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
