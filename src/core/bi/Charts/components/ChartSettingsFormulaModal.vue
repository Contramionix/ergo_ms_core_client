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
  const expression = payload.expression?.value ?? payload.expression ?? ''
  const name = payload.name ?? payload.displayName ?? ''
  const type = payload.type ?? 'expression'
  const aggregation = payload.aggregation ?? 'none'
  console.log('handleCreate emitting apply', { field: props.field, expression, name, type, aggregation })
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

