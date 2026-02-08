<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop fade show" @click="handleClose"></div>
    <div v-if="show" class="dataset-modal-wrapper">
      <ModalCenter modal-id="datasetNameModal" title="Название датасета" :custom-class="'show d-block'" dialog-class="modal-dataset-name" @closemodal="handleClose">
    <input v-model="localName" class="form-control my-3" placeholder="Введите название" @keyup.enter="submit"/>
    <div class="modal-footer-buttons">
      <button type="button" class="btn btn-secondary" @click="handleClose">Отмена</button>
      <button type="button" class="btn btn-primary" @click="submit" :disabled="!localName.trim()">Сохранить</button>
      </div>
      </ModalCenter>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'

const props = defineProps({
  show: Boolean,
  datasetName: { type: String, default: '' }
})

const emit = defineEmits(['saved', 'update:show'])

const localName = ref(props.datasetName || '')
watch(() => props.datasetName, v => { localName.value = v || '' })

function handleClose() {
  emit('update:show', false)
}

function submit() {
  const name = localName.value?.trim()
  if (!name) return
  emit('saved', name)
  emit('update:show', false)
}
</script>

<style scoped lang="scss">
.dataset-modal-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  pointer-events: none;
}

.dataset-modal-wrapper > * {
  pointer-events: auto;
}

.modal-footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

:deep(.modal-dataset-name) {
  .modal-body {
    padding-bottom: 0;
  }
}
</style>