<template>
  <div>
    <Teleport to="body">
      <div v-if="show" class="modal-backdrop fade show" @click="$emit('close')"></div>
      <div v-if="show" class="dataset-modal-wrapper">
        <ModalCenter modal-id="datasetFieldSettingsModal" title="Настройка поля" :custom-class="'show d-block'" dialog-class="modal-xl modal-field-settings" @closemodal="$emit('close')">
          <SourceSettings v-if="show" :field="selectedField" :tables="allTablesOfConnection" :selected-connection="selectedConnection" :cols="previewCols" :rows="previewRows" :dataset-fields="formulaFields" :params="formulaParams" @close="$emit('close')" @create="$emit('sourceSave', $event)"/>
        </ModalCenter>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import ModalCenter from '@/components/ModalCenter.vue'
import SourceSettings from '@/core/bi/Datasets/Fields/Source/SourceSettings.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  show: Boolean,
  selectedField: Object,
  allTablesOfConnection: { type: Array, default: () => [] },
  selectedConnection: Object,
  previewCols: { type: Array, default: () => [] },
  previewRows: { type: Array, default: () => [] },
  datasetId: { type: [String, Number], default: null },
  fields: { type: Array, default: () => [] },
  params: { type: Array, default: () => [] }
})

const formulaContext = ref(null)

watch(
  () => [props.show, props.datasetId],
  async ([show, datasetId]) => {
    if (!show || datasetId == null || datasetId === '') {
      if (!show) formulaContext.value = null
      return
    }
    try {
      const url = endpoints.bi.datasetFormulaContext(datasetId)
      const { data } = await apiClient.get(url)
      formulaContext.value = data && typeof data === 'object' ? { fields: data.fields ?? [], params: data.params ?? [] } : null
    } catch (_) {
      formulaContext.value = null
    }
  },
  { immediate: true }
)

const formulaFields = computed(() => formulaContext.value?.fields ?? props.fields ?? [])
const formulaParams = computed(() => formulaContext.value?.params ?? props.params ?? [])

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