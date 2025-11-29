<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="$emit('close')">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ isEditing ? 'Редактирование разделителя' : 'Добавление разделителя' }}
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <!-- Название -->
            <div class="mb-3">
              <label class="form-label">Название <span class="text-danger">*</span></label>
              <input 
                v-model="form.name" 
                type="text" 
                class="form-control"
                required
                placeholder="Например: Настройки, Модули"
              />
              <div class="form-text">
                Текст разделителя, который будет отображаться в меню
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Отмена
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            @click="handleSubmit"
            :disabled="!isFormValid"
          >
            {{ isEditing ? 'Сохранить' : 'Создать' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  separator: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'close'])

const isEditing = computed(() => !!props.separator?.id)

// Форма
const form = ref({
  name: '',
  before_order: 0,
  is_active: true
})

// Инициализация формы при редактировании
watch(() => props.separator, (newSeparator) => {
  if (newSeparator) {
    form.value = {
      id: newSeparator.id,
      name: newSeparator.name || '',
      before_order: newSeparator.before_order || 0,
      is_active: newSeparator.is_active !== false
    }
  } else {
    // Сброс формы для нового разделителя
    form.value = {
      name: '',
      before_order: 0,
      is_active: true
    }
  }
}, { immediate: true })

// Валидация формы
const isFormValid = computed(() => {
  return !!form.value.name
})

function handleSubmit() {
  if (!isFormValid.value) return
  
  emit('save', { ...form.value })
}
</script>

<style scoped>
.modal.show {
  background-color: rgba(0, 0, 0, 0.5);
  display: flex !important;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.modal-dialog {
  margin: 0;
  max-width: 500px;
  width: 90%;
}
</style>

