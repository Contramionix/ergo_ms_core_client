<script setup>
defineProps({
  modalId: { type: String, required: true, default: 'centralModal' },
  customClass: { type: String, required: false, default: '' },
  title: { type: String, required: true },
  showFooter: { type: Boolean, required: false, default: false },
  dialogClass: { type: String, required: false, default: '' },
})
const emit = defineEmits(['closemodal'])
</script>

<template>
  <div
    class="modal fade"
    :class="customClass"
    :id="modalId"
    tabindex="-1"
    aria-labelledby="centralModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" :class="dialogClass">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="centralModalLabel">
            {{ title }}
          </h1>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Закрыть"
            v-on:click="emit('closemodal')"
          ></button>
        </div>
        <div class="modal-body">
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
  display: flex;
  flex-direction: column;
  max-height: 100%;
  min-height: 0;
  background-color: var(--color-primary-background);
  border: none;
  border-radius: $radius-usual;
}

.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-hover-background) transparent;
}
</style>
