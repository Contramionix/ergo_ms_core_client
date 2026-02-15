<template>
  <DatasetFieldList :dataset="props.dataset" :fields="props.fields" empty-message="Параметры не найдены" icon-variant="parameters" :dropdown-items="dropdownItems" @edit-parameter="emit('editParameter', $event)"/>
</template>

<script setup>
import DatasetFieldList from './DatasetFieldList.vue'

const props = defineProps({
  dataset: Object,
  fields: { type: Array, default: () => [] },
})

const emit = defineEmits(['editParameter'])

const dropdownItems = [{ label: 'Редактировать', event: 'editParameter' }]
</script>