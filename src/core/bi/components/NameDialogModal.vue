<template>
  <div v-show="visible" class="modal-overlay">
    <div class="modal-window">
      <div class="modal-header">
        <h5 class="modal-title">{{ title }}</h5>
        <button class="close-btn" @click="cancel" type="button" aria-label="Закрыть"><X size="20" /></button>
      </div>

      <input v-model="localName" class="form-control my-3" :placeholder="placeholder" @keyup.enter="submit"/>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="cancel">Отмена</button>
        <button class="btn btn-primary" @click="submit" :disabled="!localName?.trim()">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: { type: String, default: '' },
  title: { type: String, default: 'Название' },
  placeholder: { type: String, default: 'Введите название' }
})

const emit = defineEmits(['update:visible', 'saved'])

const localName = ref(props.modelValue || '')

watch(() => props.modelValue, (newVal) => {
  localName.value = newVal || ''
})

function submit() {
  const name = localName.value?.trim()
  if (!name) return
  emit('saved', { name })
  emit('update:visible', false)
}

function cancel() {
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-window {
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  padding: 24px;
  border-radius: 12px;
  width: 480px;
  max-width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: none;
  border: none;
  color: var(--color-secondary-text);
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
