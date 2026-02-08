<template>
  <header class="file_area_header">
    <div class="file_area_header_label">
      <Database />
      <div class="header-name-input-wrapper">
        <input v-if="!isNewPage" v-model="localName"  @input="onNameInput" @focus="onFocus" @blur="onBlur" class="header-name-input" placeholder="Название датасета…"/>
        <h4 v-else class="header-label" style="margin-bottom:3px;">{{ headerName }}</h4>
      </div>
    </div>
    <div class="file_area_header_buttons">
      <button v-if="isNewPage" class="btn btn-primary" :disabled="!canCreateDataset || saving" @click="$emit('showDatasetDialog')">Создать датасет</button>
      <button class="btn btn-success save-btn" :hidden="isNewPage" :disabled="!isDirty || saving" @click="handleSave"
        style="color: var(--color-primary-background); position: relative;">
        <span v-if="!saving && !saveSuccess">Сохранить датасет</span>
        <span v-else-if="saving" class="saving-spinner">
          <SpinnerLoading loading-text="Сохраняем…" color="#fff" />
        </span>
        <span v-else-if="saveSuccess" style="display: flex; align-items: center; gap: 6px;">
          <svg width="22" height="22" viewBox="0 0 20 20">
            <polyline points="4,10 9,16 17,4" stroke="#fff" stroke-width="3" fill="none" />
          </svg>Сохранено!
        </span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Database } from 'lucide-vue-next'
import SpinnerLoading from '@/components/SpinnerLoading.vue'

const props = defineProps({
  headerName: String,
  isNewPage: Boolean,
  canCreateDataset: Boolean,
  saving: Boolean,
  saveSuccess: Boolean,
  isDirty: Boolean
})

const emit = defineEmits(['showDatasetDialog', 'editDataset', 'update:headerName'])

const localName = ref(props.headerName)
const originalName = ref(props.headerName)

watch(() => props.headerName, (newVal) => {
  if (newVal !== localName.value) {
    localName.value = newVal
    originalName.value = newVal
  }
})

function isValidName(name) {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length > 0
}

function onFocus() {
  originalName.value = props.headerName || ''
}

function onBlur() {
  if (!isValidName(localName.value)) {
    localName.value = originalName.value
    emit('update:headerName', originalName.value)
  } else {
    const trimmed = localName.value.trim()
    if (trimmed !== localName.value) {
      localName.value = trimmed
      emit('update:headerName', trimmed)
    }
  }
}

function onNameInput() {
  emit('update:headerName', localName.value)
}

function handleSave() {
  if (!isValidName(localName.value)) {
    localName.value = originalName.value
    emit('update:headerName', originalName.value)
    return
  }
  const trimmed = localName.value.trim()
  if (trimmed !== localName.value) {
    localName.value = trimmed
    emit('update:headerName', trimmed)
  }
  emit('editDataset', trimmed)
}
</script>

<style scoped lang="scss">
.file_area_header {
  position: relative;
  grid-area: header;
  background-color: var(--color-header-background);
  display: flex;
  align-items: center;
  padding: 0 1rem;
  gap: 20px;
  height: 61px;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  border-bottom: 1px solid var(--color-border);
}

.file_area_header_label {
  display: flex;
  justify-content: flex-start;
  gap: 5px;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.header-name-input-wrapper {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

.header-name-input {
  background: transparent !important;
  border: none !important;
  border-radius: 6px !important;
  padding: .25rem .5rem;
  color: inherit;
  font-size: 1.25rem;
  font-weight: 500;
  width: 100%;
  transition: background-color .2s ease, border-radius .2s ease;
  font-family: inherit;
  margin-bottom: 3px;
}

.header-name-input:hover,
.header-name-input:focus {
  background-color: var(--color-hover-background) !important;
  outline: none !important;
  box-shadow: none !important;
}

.file_area_header_buttons {
  margin-left: auto;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.btn{
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
  height: 28px;
  font-weight: 400;
  border-radius: 6px;
  padding: 12px;
}

@media (max-width: 575.98px) {
  .btn {
    font-size: 12px;
  }
}

@media (min-width: 576px) and (max-width: 767.98px) {
  .btn {
    font-size: 13px;
  }
}

@media (min-width: 768px) and (max-width: 991.98px) {
  .btn {
    font-size: 14px;
  }
}

.btn-success {
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn .saving-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn .saving-spinner :deep(.spinner-loading) {
  flex-direction: row;
  gap: 0.5rem;
}

.save-btn .saving-spinner :deep(.spinner-loading__ring) {
  width: 22px;
  height: 22px;
  border-width: 2px;
}

.save-btn .saving-spinner :deep(.spinner-loading__text) {
  font-size: inherit;
  margin: 0;
}
</style>