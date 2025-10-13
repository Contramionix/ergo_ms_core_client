<template>
  <div class="toolbar">
    <div class="tab-group">
      <button v-for="tab in tabs" :key="tab.key" class="tab-button" :class="{ active: activeTab === tab.key }" @click="$emit('update:activeTab', tab.key)">
        {{ tab.label }}
      </button>
    </div>
    <div class="button-preview">
      <button v-if="activeTab === 'fields' && !hasConnectionIssues" class="btn" style="display: flex; gap: 5px;" @click="$emit('refreshFields')">
        <template v-if="isPreviewLoading">
          <Loader class="icon-loading" /><div id="btn-text">Загрузка…</div>
        </template>
        <template v-else>
          <RefreshCw :size="16" /><div style="transform: translateY(-1.31px);">Обновить поля</div>
        </template>
      </button>
      <button class="btn" style="display: flex; gap: 5px;" @click="$emit('togglePreview')" :disabled="isPreviewLoading">
        <Eye :size="16" /><div id="btn-text">Предпросмотр</div>
      </button>
      <button v-if="activeTab === 'fields'" class="btn" style="display: flex; gap: 5px;" @click="$emit('addField')">
        <Plus :size="16" /><div id="btn-text">Добавить поле</div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { RefreshCw, Plus, Eye, Loader } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps({
  activeTab: String,
  isPreviewLoading: Boolean,
  connectionStatus: { type: String, default: 'connected' }
})

const tabs = [
  { key: 'sources', label: 'Источники' },
  { key: 'fields', label: 'Поля' },
  { key: 'params', label: 'Параметры' },
  { key: 'filters', label: 'Фильтрация' },
  { key: 'analysis', label: 'Анализ' }
]

// Вычисляемое свойство для определения проблем с подключением
const hasConnectionIssues = computed(() => {
  return props.connectionStatus === 'error'
})

defineEmits(['update:activeTab', 'refreshFields', 'togglePreview', 'addField'])
</script>

<style scoped lang="scss">
.toolbar {
  grid-area: toolbar;
  display: flex;
  background-color: var(--color-header-background);
  align-items: center;
  padding: 0 1rem;
  margin-top: 5px;
  gap: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.tab-group {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  overflow: hidden;
  height: 2rem;
}

.tab-button {
  background: transparent;
  color: var(--color-accent);
  border: none;
  padding: 0 1rem;
  font-size: 0.85rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.tab-button.active {
  background: var(--color-accent);
  color: white;
}

.tab-button:not(.active):hover {
  background: rgba(229, 57, 53, 0.2);
}

.button-preview {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

.btn{
  font-size: 13px;
  background-color: var(--color-primary-background);
  height: 28px;
  font-weight: 400;
  border-radius: 6px;
  padding: 12px;
  line-height: 1;
  align-items: center;

  &:hover {
    background-color: var(--color-hover-background);
  }
}

#btn-text {
  transform: translateY(-1.51px);
}
</style>
