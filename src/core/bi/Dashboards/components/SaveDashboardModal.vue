<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ isEditMode ? 'Сохранить изменения' : 'Создать дашборд' }}</h3>
        <button class="btn-close" @click="handleClose">
          <X :size="20" />
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="dashboard-name">Название дашборда *</label>
          <input
            id="dashboard-name"
            v-model="localName"
            type="text"
            class="form-control"
            placeholder="Введите название дашборда"
            @keyup.enter="handleSave"
          />
        </div>
        
        <div class="form-group">
          <label for="dashboard-description">Описание</label>
          <textarea
            id="dashboard-description"
            v-model="localDescription"
            class="form-control"
            rows="3"
            placeholder="Введите описание дашборда (необязательно)"
          />
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">Отмена</button>
        <button 
          class="btn btn-primary" 
          :disabled="!canSave || saving"
          @click="handleSave"
        >
          <span v-if="saving">Сохранение...</span>
          <span v-else>{{ isEditMode ? 'Сохранить' : 'Создать' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  isEditMode: {
    type: Boolean,
    default: false
  },
  saving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save'])

const localName = ref('')
const localDescription = ref('')

watch(() => props.visible, (newVal) => {
  if (newVal) {
    localName.value = props.name
    localDescription.value = props.description
  }
})

watch(() => props.name, (newVal) => {
  if (props.visible) {
    localName.value = newVal
  }
})

watch(() => props.description, (newVal) => {
  if (props.visible) {
    localDescription.value = newVal
  }
})

const canSave = computed(() => {
  return localName.value.trim().length > 0 && !props.saving
})

function handleClose() {
  emit('close')
}

function handleOverlayClick() {
  if (!props.saving) {
    handleClose()
  }
}

function handleSave() {
  if (canSave.value) {
    emit('save', {
      name: localName.value.trim(),
      description: localDescription.value.trim()
    })
  }
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: var(--color-primary-background);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  .btn-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    border-radius: 4px;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: var(--color-hover-background);
    }
  }
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  
  .form-group {
    margin-bottom: 20px;
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--color-text-primary);
    }
    
    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 14px;
      background: var(--color-primary-background);
      color: var(--color-text-primary);
      transition: border-color 0.2s;
      
      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
      
      &::placeholder {
        color: var(--color-text-secondary);
      }
    }
    
    textarea.form-control {
      resize: vertical;
      min-height: 80px;
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--color-border);
  
  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
    min-width: 100px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    
    &.btn-secondary {
      background: #dc3545;
      color: #ffffff !important;
      border: 1px solid #dc3545;
      
      &:hover {
        background: #c82333;
        border-color: #bd2130;
      }
    }
    
    &.btn-primary {
      background: #28a745;
      color: #ffffff !important;
      border: 1px solid #28a745;
      
      &:hover:not(:disabled) {
        background: #218838;
        border-color: #1e7e34;
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: #6c757d;
        border-color: #6c757d;
        color: #ffffff !important;
      }
    }
  }
}
</style>


