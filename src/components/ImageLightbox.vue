<template>
  <ModalCenter
    standalone
    :modal-id="modalId"
    :visible="visible"
    :show-title="false"
    :show-close-button="false"
    size="fullscreen"
    :scrollable="true"
    :centered="false"
    :custom-class="modalClass"
    body-class="p-0"
    :modal-aria-label="t('components.imageLightbox.image')"
    @close="emit('close')"
  >
    <div class="image-lightbox" @click.self="emit('close')">
      <div class="image-lightbox__toolbar" @click.stop>
        <div class="image-lightbox__actions">
          <HoverTooltip :text="t('components.imageLightbox.download')" wrap>
            <button
              type="button"
              class="image-lightbox__btn"
              :aria-label="t('components.imageLightbox.download')"
              @click="downloadCurrent"
            >
              <Download :size="20" aria-hidden="true" />
            </button>
          </HoverTooltip>
          <HoverTooltip :text="t('components.imageLightbox.close')" wrap>
            <button
              type="button"
              class="image-lightbox__btn"
              :aria-label="t('components.imageLightbox.close')"
              @click="emit('close')"
            >
              <X :size="20" aria-hidden="true" />
            </button>
          </HoverTooltip>
        </div>
      </div>

      <HoverTooltip v-if="items.length > 1" :text="t('components.imageLightbox.prev')" wrap>
        <button
          type="button"
          class="image-lightbox__nav image-lightbox__nav--prev"
          :aria-label="t('components.imageLightbox.prev')"
          @click.stop="goPrev"
        >
          <ChevronLeft :size="32" aria-hidden="true" />
        </button>
      </HoverTooltip>
      <HoverTooltip v-if="items.length > 1" :text="t('components.imageLightbox.next')" wrap>
        <button
          type="button"
          class="image-lightbox__nav image-lightbox__nav--next"
          :aria-label="t('components.imageLightbox.next')"
          @click.stop="goNext"
        >
          <ChevronRight :size="32" aria-hidden="true" />
        </button>
      </HoverTooltip>

      <div
        ref="stageRef"
        class="image-lightbox__stage"
        :class="{ 'image-lightbox__stage--zoomed': isZoomed }"
        @click.self="onStageClick"
      >
        <div
          v-if="current?.src"
          ref="photoRef"
          class="image-lightbox__photo"
          :class="{ 'image-lightbox__photo--zoomed': isZoomed }"
          :style="photoStyle"
          @click.stop
          @pointerdown="onPanStart"
        >
          <ContentImage
            :src="current.src"
            :alt="current.filename || t('components.imageLightbox.image')"
            loading="eager"
            class="image-lightbox__img"
          />
        </div>
        <p v-if="items.length > 1" class="image-lightbox__counter">
          {{ t('components.imageLightbox.counter', { current: displayIndex, total: items.length }) }}
        </p>
      </div>
    </div>
  </ModalCenter>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Download, X } from '@lucide/vue'
import ContentImage from './ContentImage.vue'
import HoverTooltip from './HoverTooltip.vue'
import ModalCenter from './ModalCenter.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { downloadMedia } from '@/js/utils/mediaDownload.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  modalId: { type: String, default: 'imageLightbox' },
  backdrop: {
    type: String,
    default: 'dim',
    validator: (value) => ['dim', 'blur'].includes(value),
  },
})

const emit = defineEmits(['close', 'update:index'])

const { t } = useAppI18n()

const MIN_SCALE = 1
const MAX_SCALE = 4
const SCALE_STEP = 0.2

const stageRef = ref(null)
const photoRef = ref(null)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const isPanning = ref(false)

const isZoomed = computed(() => scale.value > 1)
const photoStyle = computed(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
}))
const modalClass = computed(
  () => `image-lightbox-modal image-lightbox-modal--${props.backdrop}`,
)

function resetZoom() {
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  isPanning.value = false
}

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

function clampOffset(nextScale = scale.value, x = offsetX.value, y = offsetY.value) {
  if (nextScale <= MIN_SCALE) {
    return { x: 0, y: 0 }
  }
  const photo = photoRef.value
  const img = photo?.querySelector?.('.ergo-content-image__img')
  if (!photo || !img) {
    return { x, y }
  }
  const viewW = photo.clientWidth
  const viewH = photo.clientHeight
  const visW = img.offsetWidth * nextScale
  const visH = img.offsetHeight * nextScale
  const maxX = visW > viewW ? (visW - viewW) / 2 : 0
  const maxY = visH > viewH ? (visH - viewH) / 2 : 0
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  }
}

function applyOffset(x, y, nextScale = scale.value) {
  const clamped = clampOffset(nextScale, x, y)
  offsetX.value = clamped.x
  offsetY.value = clamped.y
}

function onStageClick() {
  if (isZoomed.value) return
  emit('close')
}

function onWheel(e) {
  if (!props.visible || (!e.ctrlKey && !e.metaKey)) return
  e.preventDefault()
  const oldScale = scale.value
  const next = clampScale(oldScale + (e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP))
  if (next === oldScale) return

  let nextX = offsetX.value
  let nextY = offsetY.value
  const rect = stageRef.value?.getBoundingClientRect()
  if (rect) {
    const px = e.clientX - (rect.left + rect.width / 2)
    const py = e.clientY - (rect.top + rect.height / 2)
    nextX = px - ((px - offsetX.value) * next) / oldScale
    nextY = py - ((py - offsetY.value) * next) / oldScale
  }
  scale.value = next
  applyOffset(nextX, nextY, next)
}

function onPanStart(e) {
  if (!isZoomed.value || e.button !== 0) return
  e.preventDefault()
  isPanning.value = true
  const startX = e.clientX
  const startY = e.clientY
  const originX = offsetX.value
  const originY = offsetY.value
  const pointerId = e.pointerId
  const target = e.currentTarget
  target.setPointerCapture?.(pointerId)

  function onMove(moveEvent) {
    applyOffset(
      originX + (moveEvent.clientX - startX),
      originY + (moveEvent.clientY - startY),
    )
  }

  function onUp() {
    isPanning.value = false
    target.releasePointerCapture?.(pointerId)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

const current = computed(() => {
  const list = props.items
  if (!list.length) return null
  const safeIndex = Math.min(Math.max(props.index, 0), list.length - 1)
  return list[safeIndex] || null
})

const displayIndex = computed(() => {
  if (!props.items.length) return 0
  return Math.min(Math.max(props.index, 0), props.items.length - 1) + 1
})

function goPrev() {
  if (props.items.length < 2) return
  const next = (props.index - 1 + props.items.length) % props.items.length
  emit('update:index', next)
}

function goNext() {
  if (props.items.length < 2) return
  const next = (props.index + 1) % props.items.length
  emit('update:index', next)
}

async function downloadCurrent() {
  const item = current.value
  if (!item?.src) return
  try {
    await downloadMedia(item.src, { filename: item.filename })
  } catch (error) {
    logError('Не удалось скачать вложение', error)
  }
}

function onKeydown(e) {
  if (!props.visible) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    goPrev()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    goNext()
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown)
      document.addEventListener('wheel', onWheel, { passive: false })
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.removeEventListener('wheel', onWheel)
      resetZoom()
    }
  },
)

watch(
  () => [props.index, current.value?.src],
  () => {
    resetZoom()
  },
)

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('wheel', onWheel)
})
</script>

<style lang="scss" scoped>
@use '@/scss/ui/mixins' as *;

.image-lightbox {
  position: absolute;
  inset: 0;
  overflow: hidden;

  > :deep(.hover-tooltip) {
    display: contents;
  }
}

.image-lightbox__toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  padding-top: calc(0.75rem + env(safe-area-inset-top, 0px));
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), transparent);
  color: var(--bs-white);
}

.image-lightbox__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;

  :deep(.hover-tooltip) {
    display: contents;
  }
}

.image-lightbox__btn,
.image-lightbox__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(0, 0, 0, 0.35);
  color: var(--bs-white);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
  @include ui-a11y-focus;
  @include ui-reduced-motion;

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.22);
  }
}

.image-lightbox__btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;

  &:hover,
  &:focus-visible {
    transform: scale(1.08);
  }
}

.image-lightbox__nav {
  position: absolute;
  top: 50%;
  z-index: 2;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  transform: translateY(-50%);

  &:hover,
  &:focus-visible {
    transform: translateY(-50%) scale(1.08);
  }

  &--prev {
    left: 0.75rem;
  }

  &--next {
    right: 0.75rem;
  }
}

.image-lightbox__stage {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4.5rem 4rem 2.75rem;
  box-sizing: border-box;
  overflow: hidden;

  &--zoomed {
    cursor: grab;
  }
}

.image-lightbox__photo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  will-change: transform;

  &--zoomed {
    cursor: grab;
  }
}

.image-lightbox__photo--zoomed:active,
.image-lightbox__stage--zoomed:active {
  cursor: grabbing;
}

.image-lightbox__counter {
  position: absolute;
  bottom: 0.85rem;
  left: 50%;
  z-index: 2;
  margin: 0;
  transform: translateX(-50%);
  color: var(--bs-white);
  font-size: 0.875rem;
  line-height: 1.2;
  text-align: center;
  pointer-events: none;
}

:deep(.ergo-content-image) {
  display: flex !important;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: auto;
}

:deep(.ergo-content-image__img) {
  display: block;
  max-width: calc(100vw - 8rem) !important;
  max-height: calc(100dvh - 8.5rem) !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain;
  border-radius: 0.25rem;
}
</style>

<style lang="scss">
.image-lightbox-modal {
  overflow: hidden !important;

  &--dim {
    background-color: rgba(0, 0, 0, 0.92) !important;
  }

  &--blur {
    background-color: rgba(0, 0, 0, 0.45) !important;
    backdrop-filter: blur(16px);
  }

  .mc-standalone__dialog,
  .mc-standalone__dialog:not(.modal-dialog-scrollable),
  .modal-dialog {
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
  }

  .modal-content,
  .mc-standalone__dialog:not(.modal-dialog-scrollable) .modal-content {
    background: transparent;
    border: none;
    border-radius: 0;
    height: 100% !important;
    max-height: 100dvh !important;
    box-shadow: none;
    overflow: hidden !important;
  }

  .modal-body,
  .mc-standalone__dialog:not(.modal-dialog-scrollable) .modal-body {
    position: relative;
    flex: 1 1 auto !important;
    height: 100% !important;
    max-height: 100% !important;
    min-height: 0;
    padding: 0;
    overflow: hidden !important;
  }
}
</style>
