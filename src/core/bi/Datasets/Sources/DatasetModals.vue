<template>
  <!-- Модальное окно настроек поля -->
  <transition name="fade">
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-window modal-window-fields">
        <div class="modal-header">
          <h5>Настройка поля</h5>
          <button class="close-btn" @click="$emit('closeModal')">&times;</button>
        </div>
        <SourceSettings 
          v-if="showModal" 
          :field="selectedField" 
          :tables="allTablesOfConnection" 
          :selected-connection="selectedConnection"
          :cols="previewCols"
          :rows="previewRows" 
          @close="$emit('closeModal')" 
          @save="$emit('sourceSave', $event)" 
        />
      </div>
    </div>
  </transition>

  <!-- Модальное окно связей таблиц -->
  <transition name="fade">
    <div v-if="showTableLinkModal" class="modal-overlay">
      <div class="modal-window table-link-modal">
        <TableLinkModal 
          :all-tables="allTablesOfConnection" 
          :linked-table-ids="computedLinkedTableIds"
          :main-table="mainTable" 
          :edit-relation="editingRelation" 
          :dataset-id="currentDatasetId"
          :selected-connection="selectedConnection"
          @close="$emit('closeTableLinkModal')" 
          @apply="$emit('relationApply', $event)" 
        />
      </div>
    </div>
  </transition>

        <!-- Модальное окно создания датасета -->
      <transition name="fade">
        <div v-if="showDatasetDialog" class="modal-overlay">
          <DatasetNameDialog 
            :visible="showDatasetDialog" 
            :modelValue="datasetName" 
            @saved="$emit('datasetSaved', $event)"
            @update:visible="$emit('update:showDatasetDialog', $event)" 
          />
        </div>
      </transition>
</template>

<script setup>
import { computed } from 'vue'
import SourceSettings from '../../Datasets/Fields/Source/SourceSettings.vue'
import TableLinkModal from './TableLinkModal.vue'
import DatasetNameDialog from '../../Datasets/components/DatasetNameDialog.vue'

const props = defineProps({
  showModal: Boolean,
  selectedField: Object,
  selectedTables: Array,
  previewCols: Array,
  previewRows: Array,
  showTableLinkModal: Boolean,
  allTablesOfConnection: Array,
  editingRelation: Object,
  mainTable: Object,
  currentDatasetId: [String, Number],
  showDatasetDialog: Boolean,
  datasetName: String,
  selectedConnection: Object,
  usedRightTableIds: Array
})

const emit = defineEmits([
  'closeModal',
  'sourceSave',
  'closeTableLinkModal',
  'relationApply',
  'datasetSaved',
  'update:showDatasetDialog'
])

// Вычисляем доступные ID таблиц для связей
const computedLinkedTableIds = computed(() => {
  if (props.editingRelation?.rightTableId) {
    return props.usedRightTableIds?.filter(
      id => String(id) !== String(props.editingRelation.rightTableId)
    ) || []
  }
  return props.usedRightTableIds || []
})
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
}

.modal-window {
  background: var(--color-primary-background);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  transform: none;
  z-index: 100001;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h5 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-primary-text);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-secondary-text);
  padding: 0;
}

.table-link-modal {
  width: 624px;
  min-height: 310px;
  background: var(--color-primary-background);
  border-radius: 12px;
  box-shadow: 0 8px 32px #000b;
  padding: 0;
  position: relative;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-window-fields {
  width: min(1200px, 95vw);
  height: min(750px, 90vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Контент после шапки занимает доступную высоту и не вываливается */
.modal-window-fields > .modal-header {
  flex: 0 0 auto;
}
.modal-window-fields > :not(.modal-header) {
  flex: 1 1 auto;
  min-height: 0; /* важно для корректной работы overflow у внутренних областей */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
