<template>
    <div v-show="visible" class="modal-overlay">
      <div class="modal-window">
        <div class="modal-header">
          <h4>{{ singleSelect ? 'Выбрать лист для замены' : 'Добавить листы' }}</h4>
          <button class="close-btn" @click="cancel">×</button>
        </div>
  
        <div class="modal-body">
          <div v-if="!singleSelect" class="select-all">
            <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" id="select-all" @change="toggleAll" :disabled="!sheets?.length"/>
                <label class="form-check-label" for="select-all">
                    Выбрать все
                </label>
            </div>
          </div>
          <div class="sheet-list">
            <div class="form-check" v-for="sheet in safeSheets" :key="sheet">
                <input 
                    class="form-check-input" 
                    :type="singleSelect ? 'radio' : 'checkbox'" 
                    :name="singleSelect ? 'sheet-selection' : undefined"
                    :id="'sheet-' + sheet" 
                    :value="sheet" 
                    :checked="isSheetSelected(sheet)"
                    @change="handleSheetChange(sheet, $event)"/>
                <label class="form-check-label" :for="'sheet-' + sheet">
                    {{ filename || 'Файл' }} – {{ sheet }}
                </label>
            </div>
            <div v-if="!safeSheets.length">Листы не найдены</div>
          </div>
        </div>
  
        <div class="modal-footer">
          <button class="btn-cancel" @click="cancel">Отмена</button>
          <button class="btn-confirm" :disabled="singleSelect ? !selectedSheet : !selectedSheets.length" @click="confirm">{{ singleSelect ? 'Выбрать' : 'Добавить' }}</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, computed } from 'vue'
  
  const props = defineProps({
    visible: Boolean,
    filename: String,
    sheets: Array,
    currentSheet: String,
    singleSelect: Boolean
  })
  
  const emit = defineEmits(['confirm', 'cancel'])
  
  const selectedSheets = ref([])
  const selectedSheet = ref('')
  const selectAll = ref(false)
  const safeSheets = computed(() => props.sheets || [])
  
  watch(selectAll, (val) => {
    selectedSheets.value = val ? [...safeSheets.value] : []
  })
  
  function toggleAll() {
    const allSelected = selectedSheets.value.length === safeSheets.value.length
    selectedSheets.value = allSelected ? [] : [...safeSheets.value]
  }

  function isSheetSelected(sheet) {
    if (props.singleSelect) {
      return selectedSheet.value === sheet
    } else {
      return selectedSheets.value.includes(sheet)
    }
  }

  function handleSheetChange(sheet, event) {
    if (props.singleSelect) {
      // В режиме единичного выбора просто устанавливаем выбранный лист
      selectedSheet.value = event.target.checked ? sheet : ''
    } else {
      // В режиме множественного выбора добавляем/удаляем из массива
      if (event.target.checked) {
        if (!selectedSheets.value.includes(sheet)) {
          selectedSheets.value.push(sheet)
        }
      } else {
        const index = selectedSheets.value.indexOf(sheet)
        if (index > -1) {
          selectedSheets.value.splice(index, 1)
        }
      }
    }
  }
  
  function confirm() {
    if (props.singleSelect) {
      emit('confirm', selectedSheet.value ? [selectedSheet.value] : [])
    } else {
      emit('confirm', selectedSheets.value)
    }
  }
  
  function cancel() {
    emit('cancel')
  }
  
  watch(() => props.visible, (val) => {
    if (val) {
      selectedSheets.value = []
      // В режиме единичного выбора предварительно выбираем текущий лист, если он есть
      selectedSheet.value = props.singleSelect && props.currentSheet ? props.currentSheet : ''
      selectAll.value = false
    }
  })
  </script>
  
<style scoped>
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: var(--color-primary-background);
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
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--color-secondary-text);
      cursor: pointer;
    }
  
    .modal-body {
      max-height: 300px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1rem;
    }
  
    .btn-cancel {
      background: transparent;
      color: var(--color-secondary-text);
      border: 1px solid var(--color-border);
      padding: 6px 12px;
      border-radius: 6px;
    }
  
    .btn-confirm {
      background: var(--color-accent);
      color: var(--color-primary-text);
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
    }
  
    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
</style>
  