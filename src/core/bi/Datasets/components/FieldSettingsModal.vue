<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop fade show" @click="$emit('close')"></div>
    <div v-if="show" class="dataset-modal-wrapper">
      <ModalCenter modal-id="datasetFieldSettingsModal" title="Настройка поля" :custom-class="'show d-block'" dialog-class="modal-xl modal-field-settings" @closemodal="$emit('close')">
        <SourceSettings v-if="show" :field="selectedField" :tables="allTablesOfConnection" :selected-connection="selectedConnection" :cols="previewCols" :rows="previewRows" @close="$emit('close')" @create="$emit('sourceSave', $event)"/>
      </ModalCenter>
    </div>
  </Teleport>
</template>

<script setup>
import ModalCenter from '@/components/ModalCenter.vue'
import SourceSettings from '@/core/bi/Datasets/Fields/Source/SourceSettings.vue'

defineProps({
  show: Boolean,
  selectedField: Object,
  allTablesOfConnection: { type: Array, default: () => [] },
  selectedConnection: Object,
  previewCols: { type: Array, default: () => [] },
  previewRows: { type: Array, default: () => [] }
})

defineEmits(['close', 'sourceSave'])
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
</style>