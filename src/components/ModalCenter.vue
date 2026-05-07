<script setup>
import { computed } from 'vue'

const props = defineProps({
  modalId: { type: String, default: 'centralModal' },
  customClass: { type: String, default: '' },
  title: { type: String, default: '' },
  showTitle: { type: Boolean, default: true },
  modalAriaLabel: { type: String, default: '' },
  showFooter: { type: Boolean, default: false },
  dialogClass: { type: String, default: '' },
  bodyClass: { type: String, default: '' },
})

const emit = defineEmits(['closemodal'])

const rootAriaLabelledby = computed(() =>
  props.showTitle ? 'centralModalLabel' : undefined,
)

const rootAriaLabel = computed(() => {
  if (props.showTitle) return undefined
  return props.modalAriaLabel || undefined
})
</script>

<template>
  <div
    class="modal fade"
    :class="customClass"
    :id="modalId"
    tabindex="-1"
    :aria-labelledby="rootAriaLabelledby"
    :aria-label="rootAriaLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" :class="dialogClass">
      <div class="modal-content">
        <div v-if="showTitle" class="modal-header">
          <h1 class="modal-title fs-5 d-flex align-items-center gap-2" id="centralModalLabel">
            <slot name="title">{{ title }}</slot>
          </h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Закрыть"
            v-on:click.stop="emit('closemodal')"
          ></button>
        </div>

        <button
          v-else
          type="button"
          class="modal-content__floating-close btn-close"
          data-bs-dismiss="modal"
          aria-label="Закрыть"
          v-on:click.stop="emit('closemodal')"
        ></button>

        <div class="modal-body" :class="bodyClass">
          <slot></slot>
        </div>
        <div v-if="showFooter" class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
          <button type="submit" class="btn btn-primary">Сохранить</button>
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
