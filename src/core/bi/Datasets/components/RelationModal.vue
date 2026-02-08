<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop fade show" @click="$emit('close')"></div>
    <div v-if="show" class="dataset-modal-wrapper">
      <ModalCenter modal-id="datasetRelationModal" title="Связь" :custom-class="'show d-block'" dialog-class="relation-modal-dialog" @closemodal="$emit('close')">
        <div class="relation-modal-body">
      <TableLinkModal :all-tables="allTablesOfConnection" :linked-table-ids="computedLinkedTableIds" :main-table="mainTable" :edit-relation="editingRelation" :dataset-id="currentDatasetId" :selected-connection="selectedConnection" @close="$emit('close')" @apply="$emit('relationApply', $event)"/>
        </div>
      </ModalCenter>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import TableLinkModal from '@/core/bi/Datasets/Sources/TableLinkModal.vue'

const props = defineProps({
  show: Boolean,
  allTablesOfConnection: { type: Array, default: () => [] },
  usedRightTableIds: { type: Array, default: () => [] },
  editingRelation: Object,
  mainTable: Object,
  currentDatasetId: [String, Number],
  selectedConnection: Object
})

defineEmits(['close', 'relationApply'])

const computedLinkedTableIds = computed(() => {
  if (props.editingRelation?.rightTableId) {
    return (props.usedRightTableIds || []).filter(
      id => String(id) !== String(props.editingRelation.rightTableId)
    )
  }
  return props.usedRightTableIds || []
})
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

.relation-modal-body {
  min-height: 310px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.relation-modal-dialog) {
  width: 624px;
  min-width: 624px;
  max-width: 624px;
  max-height: 90vh;

  .modal-body {
    padding: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
</style>