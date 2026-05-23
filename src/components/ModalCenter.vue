<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'

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

const handleClose = () => {
  emit('close')
  emit('closemodal')
}

let applyBackdropStyle = null
let resetBackdropStyle = null

onMounted(() => {
  if (props.backdropEffect === 'dim') return

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
  if (!applyBackdropStyle) return
  const el = document.getElementById(props.modalId)
  if (!el) return
  el.removeEventListener('show.bs.modal', applyBackdropStyle)
  el.removeEventListener('hide.bs.modal', resetBackdropStyle)
})
</script>

<template>
  <div class="modal fade" :class="customClass" :id="modalId" tabindex="-1" :aria-labelledby="rootAriaLabelledby" :aria-label="rootAriaLabel" aria-hidden="true" :data-bs-backdrop="backdrop" :data-bs-keyboard="keyboard">
    <div class="modal-dialog" :class="dialogComputedClass">
      <div class="modal-content">
        <div v-if="showTitle" class="modal-header">
          <h1 class="modal-title fs-5 d-flex align-items-center gap-2" :id="titleId">
            <slot name="title">{{ title }}</slot>
          </h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть" @click.stop="handleClose"></button>
        </div>
        <button v-else type="button" class="modal-content__floating-close btn-close" data-bs-dismiss="modal" aria-label="Закрыть" @click.stop="handleClose"></button>
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
