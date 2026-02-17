<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
    <div v-if="visible" class="chart-formula-modal-wrapper">
      <ModalCenter
        modal-id="chartSettingsFormulaModal"
        :title="modalTitle"
        custom-class="show d-block"
        dialog-class="modal-xl modal-field-settings"
        @closemodal="close"
      >
        <SourceSettings
          :field="field"
          :cols="cols"
          :rows="rows"
          :tables="[]"
          :params="params"
          :formula-only="true"
          @close="close"
          @create="handleCreate"
        />
      </ModalCenter>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import SourceSettings from '@/core/bi/Datasets/Fields/Source/SourceSettings.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  field: { type: Object, default: null },
  cols: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  params: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'apply'])

const modalTitle = computed(() => {
  const name = props.field?.displayName ?? props.field?.name ?? ''
  return name ? `Формула: ${name}` : 'Формула'
})

function close() {
  emit('update:visible', false)
}

function handleCreate(payload) {
  console.log('handleCreate called', payload)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a44aee1f-2951-4304-be5f-5636a639a7f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChartSettingsFormulaModal.vue:48',message:'handleCreate payload received',data:{payload,field:props.field},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const expression = payload.expression?.value ?? payload.expression ?? ''
  const name = payload.name ?? payload.displayName ?? ''
  const type = payload.type ?? 'expression'
  const aggregation = payload.aggregation ?? 'none'
  console.log('handleCreate emitting apply', { field: props.field, expression, name, type, aggregation })
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a44aee1f-2951-4304-be5f-5636a639a7f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChartSettingsFormulaModal.vue:55',message:'handleCreate emitting apply',data:{expression,name,type,aggregation,field:props.field},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  emit('apply', { field: props.field, expression, name, type, aggregation })
  close()
}
</script>

<style scoped lang="scss">
.chart-formula-modal-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  pointer-events: none;
}

.chart-formula-modal-wrapper > * {
  pointer-events: auto;
}
</style>

