<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'

const SIZE_CLASS_MAP = {
  sm: 'modal-sm',
  lg: 'modal-lg',
  xl: 'modal-xl',
  fullscreen: 'modal-fullscreen',
}

const props = defineProps({
  modalId: { type: String, default: 'centralModal' },
  customClass: { type: String, default: '' },
  title: { type: String, default: '' },
  showTitle: { type: Boolean, default: true },
  showCloseButton: { type: Boolean, default: true },
  modalAriaLabel: { type: String, default: '' },
  showFooter: { type: Boolean, default: false },
  dialogClass: { type: String, default: '' },
  bodyClass: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl', 'fullscreen'].includes(v),
  },
  centered: { type: Boolean, default: true },
  scrollable: { type: Boolean, default: true },
  keyboard: { type: Boolean, default: true },
  backdrop: { type: [Boolean, String], default: true },
  backdropEffect: {
    type: String,
    default: 'dim',
    validator: (v) => ['dim', 'blur', 'both'].includes(v),
  },
  backdropBlur: { type: Number, default: 4 },
  standalone: { type: Boolean, default: false },
  visible: { type: Boolean, default: false },
  closeOnBackdrop: { type: Boolean, default: true },
  closeOnEsc: { type: Boolean, default: true },
  lockBodyScroll: { type: Boolean, default: true },
  zIndex: { type: [Number, String], default: null },
  dialogStyle: { type: [Object, String], default: null },
})

const emit = defineEmits(['close', 'closemodal'])

const titleId = computed(() => `${props.modalId}Label`)

const rootAriaLabelledby = computed(() =>
  props.showTitle ? titleId.value : undefined,
)

const rootAriaLabel = computed(() => {
  if (props.showTitle) return undefined
  return props.modalAriaLabel || undefined
})

const dialogComputedClass = computed(() => {
  const classes = []
  if (props.centered) classes.push('modal-dialog-centered')
  if (props.scrollable) classes.push('modal-dialog-scrollable')
  const sizeClass = SIZE_CLASS_MAP[props.size]
  if (sizeClass) classes.push(sizeClass)
  if (props.dialogClass) classes.push(props.dialogClass)
  return classes
})

const standaloneRootStyle = computed(() => {
  if (props.zIndex == null || props.zIndex === '') return undefined
  const value = props.zIndex
  return {
    '--bs-modal-zindex': value,
    zIndex: value,
  }
})

const handleClose = () => {
  emit('close')
  emit('closemodal')
}

const onBackdropClick = () => {
  if (props.standalone && props.closeOnBackdrop) {
    handleClose()
  }
}

const onKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (!props.standalone || !props.closeOnEsc || !props.visible) return
  handleClose()
}

const setBodyScrollLocked = (locked) => {
  if (!props.lockBodyScroll) return
  document.body.style.overflow = locked ? 'hidden' : ''
}

watch(
  () => props.standalone && props.visible,
  (open) => {
    if (!props.standalone) return
    if (open) {
      setBodyScrollLocked(true)
      document.addEventListener('keydown', onKeydown)
    } else {
      setBodyScrollLocked(false)
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

let applyBackdropStyle = null
let resetBackdropStyle = null

onMounted(() => {
  if (props.standalone || props.backdropEffect === 'dim') return

  const el = document.getElementById(props.modalId)
  if (!el) return

  applyBackdropStyle = () => {
    requestAnimationFrame(() => {
      const bd = document.querySelector('.modal-backdrop')
      if (!bd) return
      if (props.backdropEffect === 'blur') bd.style.background = 'transparent'
      bd.style.backdropFilter = `blur(${props.backdropBlur}px)`
    })
  }

  resetBackdropStyle = () => {
    const bd = document.querySelector('.modal-backdrop')
    if (!bd) return
    bd.style.backdropFilter = ''
    bd.style.background = ''
  }

  el.addEventListener('show.bs.modal', applyBackdropStyle)
  el.addEventListener('hide.bs.modal', resetBackdropStyle)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (props.standalone) {
    setBodyScrollLocked(false)
  }
  if (!applyBackdropStyle) return
  const el = document.getElementById(props.modalId)
  if (!el) return
  el.removeEventListener('show.bs.modal', applyBackdropStyle)
  el.removeEventListener('hide.bs.modal', resetBackdropStyle)
})
</script>

<template>
  <Teleport v-if="standalone" to="body">
    <div
      v-if="visible"
      :id="modalId"
      class="modal fade show d-block mc-standalone"
      :class="customClass"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="rootAriaLabelledby"
      :aria-label="rootAriaLabel"
      :style="standaloneRootStyle"
      @mousedown.self="onBackdropClick"
    >
      <div class="modal-dialog mc-standalone__dialog" :class="dialogComputedClass" :style="dialogStyle" @mousedown.stop>
        <div class="modal-content">
          <div v-if="showTitle" class="modal-header">
            <h1 class="modal-title fs-5 d-flex align-items-center gap-2" :id="titleId">
              <slot name="title">{{ title }}</slot>
            </h1>
            <button v-if="showCloseButton" type="button" class="btn-close" aria-label="Закрыть" @click.stop="handleClose"></button>
          </div>
          <button
            v-else-if="!showTitle && showCloseButton"
            type="button"
            class="modal-content__floating-close btn-close"
            aria-label="Закрыть"
            @click.stop="handleClose"
          ></button>
          <div class="modal-body" :class="bodyClass">
            <slot></slot>
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <div
    v-else-if="!standalone"
    class="modal fade"
    :class="customClass"
    :id="modalId"
    tabindex="-1"
    :aria-labelledby="rootAriaLabelledby"
    :aria-label="rootAriaLabel"
    aria-hidden="true"
    :data-bs-backdrop="backdrop"
    :data-bs-keyboard="keyboard"
  >
    <div class="modal-dialog" :class="dialogComputedClass" :style="dialogStyle">
      <div class="modal-content">
        <div v-if="showTitle" class="modal-header">
          <h1 class="modal-title fs-5 d-flex align-items-center gap-2" :id="titleId">
            <slot name="title">{{ title }}</slot>
          </h1>
          <button v-if="showCloseButton" type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть" @click.stop="handleClose"></button>
        </div>
        <button v-else-if="!showTitle && showCloseButton" type="button" class="modal-content__floating-close btn-close" data-bs-dismiss="modal" aria-label="Закрыть" @click.stop="handleClose"></button>
        <div class="modal-body" :class="bodyClass">
          <slot></slot>
        </div>

        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mc-standalone {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: var(--bs-modal-zindex);
  background-color: rgba(0, 0, 0, var(--bs-backdrop-opacity, 0.5));
  overflow-x: hidden;
  overflow-y: auto;
}

.mc-standalone__dialog {
  position: relative !important;
  z-index: 1 !important;
  margin: 1.75rem auto;
  pointer-events: auto;
}

.modal-dialog {
  max-height: 90vh;
}

.modal-header {
  color: var(--color-primary-text);
  border-bottom: 1px solid var(--color-secondary-background);

  .btn-close:focus {
    box-shadow: none;
  }
}

.modal-content {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  min-height: 0;
  background-color: var(--color-primary-background);
  border: none;
  border-radius: $radius-usual;
}

.modal-content__floating-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 10;

  &:focus {
    box-shadow: none;
  }
}

.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-hover-background) transparent;
}
</style>
