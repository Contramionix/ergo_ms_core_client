<template>
  <DatasetFieldList :dataset="props.dataset" :fields="props.fields" empty-message="Показатели не найдены" :show-formula="true" icon-variant="default" :dropdown-items="dropdownItems" @open-formula="emit('openFormula', $event)" @duplicate="emit('duplicate', $event)" @remove-duplicate="emit('removeDuplicate', $event)"/>
</template>

<script setup>
import { computed } from 'vue'
import DatasetFieldList from './DatasetFieldList.vue'

const props = defineProps({
  dataset: Object,
  fields: { type: Array, default: () => [] },
})

const emit = defineEmits(['openFormula', 'duplicate', 'removeDuplicate'])

const dropdownItems = computed(() => [
  { label: 'Дублировать', event: 'duplicate' },
  { label: 'Удалить', event: 'removeDuplicate', visible: (f) => f.isDuplicate, danger: true },
])
</script>