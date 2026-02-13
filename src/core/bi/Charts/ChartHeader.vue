<template>
  <div class="body-header border-elements elements-color">
    <div class="header-label-icon">
      <span class="chart-type-icon-header" :style="chartTypeIconStyle">
        <component :is="chartTypeIconComponent" />
      </span>
      <div style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
        <h4 class="header-label" style="margin-bottom: 3px;">{{ chartName }}</h4>
      </div>
    </div>
    <div class="header-label-buttons">
      <button v-if="canRunAnalysis" class="btn text-white btn-sm btn-success" @click="emit('run-chart-analysis')" style="display: flex; gap: 5px; justify-content: center; align-items: center;">
        <BrainCircuit :size="18" />Интеллектуальный анализ
      </button>
      <button class="btn btn-sm fw-bold btn-full-screen" :class="{ active: isFullScreen }" style="display: flex; gap: 5px; justify-content: center; align-items: center;" @click="emit('toggle-full-screen')">
        <Maximize />На весь экран
      </button>
      <button class="btn btn-sm btn-primary" :disabled="isSaveDisabled" @click="emit('save-click')">
        {{ isEditMode ? 'Сохранить изменения' : 'Создать график' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { BrainCircuit, Maximize } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps({
  chartName: {
    type: String,
    default: '',
  },
  chartTypeIconComponent: {
    type: [Object, String, Function],
    required: true,
  },
  chartTypeIconStyle: {
    type: Object,
    default: () => ({}),
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
  datasetRows: {
    type: Array,
    default: () => [],
  },
  ollamaAvailable: {
    type: Boolean,
    default: false,
  },
  isFullScreen: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  chartRequiredFieldsFilled: {
    type: Boolean,
    default: false,
  },
  isChartDirty: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['run-chart-analysis', 'toggle-full-screen', 'save-click'])

const canRunAnalysis = computed(
  () =>
    props.isEditMode &&
    props.datasetRows &&
    props.datasetRows.length > 0 &&
    props.ollamaAvailable,
)

const isSaveDisabled = computed(
  () =>
    (props.isEditMode && props.loading) ||
    !props.chartRequiredFieldsFilled ||
    !props.isChartDirty,
)
</script>

<style scoped lang="scss">
.body-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.header-label-icon {
  display: flex;
  justify-content: center;
  gap: 15px;
  align-items: center;
}

.header-label-buttons {
  display: flex;
  gap: 15px;
}

.border-elements {
  border-radius: 8px;
}

.elements-color {
  background-color: var(--color-primary-background);
}

.btn-full-screen:hover {
  background-color: var(--color-hover-background);
}
</style>