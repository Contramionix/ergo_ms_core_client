<template>
  <div v-if="file">
    <CsvPreview v-if="isCsvFile(file)" :file="file" :isLoading="isLoading" :key="`csv-${file.id || file.temp_path || file.name}`" />

    <XlsxPreview v-else-if="isXlsxFile(file)" :file="file" :isLoading="isLoading" :key="`xlsx-${file.id || file.temp_path || file.name}`"/>

    <TxtPreview v-else-if="isTxtFile(file)" :file="file" :isLoading="isLoading" :key="`txt-${file.id || file.temp_path || file.name}`" />

    <div v-else class="text-muted p-4">Формат файла не поддерживается для предпросмотра.</div>
  </div>
</template>

<script setup>
import CsvPreview from './FilePreview/CsvPreview.vue'
import XlsxPreview from './FilePreview/XlsxPreview.vue'
import TxtPreview from './FilePreview/TxtPreview.vue'

const props = defineProps({
  file: Object,
  isLoading: Boolean
})

function isXlsxFile(file) {
  if (!file) return false
  if (file.file_type === 'xlsx') return true
  if (file.name && file.name.toLowerCase().endsWith('.xlsx')) return true
  return false
}

function isTxtFile(file) {
  return file.file_type === 'txt' ||
    (file.name && file.name.toLowerCase().endsWith('.txt'))
}

function isCsvFile(file) {
  return file.file_type === 'csv' ||
    (file.name && file.name.toLowerCase().endsWith('.csv'))
}
</script>
  
<style scoped></style>
  