<template>
  <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
  <ModalCenter
    v-if="visible"
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
      :formula-only="true"
      @close="close"
      @create="onCreate"
    />
  </ModalCenter>
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
})

const emit = defineEmits(['update:visible', 'apply'])

const modalTitle = computed(() => {
  const name = props.field?.displayName ?? props.field?.name ?? ''
  return name ? `Формула: ${name}` : 'Формула'
})

function close() {
  emit('update:visible', false)
}

function onCreate(payload) {
  const expression = payload.expression?.value ?? payload.expression ?? ''
  emit('apply', { field: props.field, expression })
  close()
}
</script>
