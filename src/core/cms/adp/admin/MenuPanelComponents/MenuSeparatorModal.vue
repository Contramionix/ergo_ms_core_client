<template>
  <ModalCenter standalone :visible="true" modal-id="menuSeparatorModal" :title="isEditing ? 'Редактирование разделителя' : 'Добавление разделителя'" @closemodal="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label class="form-label">Название <span class="text-danger">*</span></label>
        <input v-model="form.name" type="text" class="form-control" required placeholder="Например: Настройки, Модули"/>
        <div class="form-text">Текст разделителя, который будет отображаться в меню</div>
      </div>
    </form>
    <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Отмена</button>
      <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="!isFormValid">
        {{ isEditing ? 'Сохранить' : 'Создать' }}
      </button>
    </div>
  </ModalCenter>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'

const props = defineProps({
  separator: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'close'])

const isEditing = computed(() => !!props.separator?.id)

const form = ref({
  name: '',
  before_order: 0,
  is_active: true
})

watch(() => props.separator, (newSeparator) => {
  if (newSeparator) {
    form.value = {
      id: newSeparator.id,
      name: newSeparator.name || '',
      before_order: newSeparator.before_order || 0,
      is_active: newSeparator.is_active !== false
    }
  } else {
    form.value = {
      name: '',
      before_order: 0,
      is_active: true
    }
  }
}, { immediate: true })

const isFormValid = computed(() => {
  return !!form.value.name
})

function handleSubmit() {
  if (!isFormValid.value) return
  emit('save', { ...form.value })
}
</script>