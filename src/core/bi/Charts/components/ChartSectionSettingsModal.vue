<template>
  <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
  <ModalCenter v-if="visible" modal-id="chartSectionSettingsModal" :title="modalTitle" custom-class="show d-block" dialog-class="chart-section-settings-modal-dialog" @closemodal="close">
    <template #title>
      <span v-if="sectionIcon" class="section-modal-title-icon">
        <component :is="sectionIcon" size="20" />
      </span>
      <span>{{ modalTitle }}</span>
    </template>
    <div class="section-modal-content">
      <template v-if="settingKey === 'x'">
        <SectionAxisXForm v-model="localAxis" :axis-fields="sectionFields" />
      </template>
      <template v-else-if="settingKey === 'y' || settingKey === 'y2'">
        <SectionAxisYForm v-model="localAxis" :axis-fields="sectionFields" />
      </template>
      <template v-else-if="settingKey === 'color'">
        <SectionColorTableForm v-if="chartTypeNorm === 'table'" v-model="localColors" />
        <SectionColorForm v-else v-model="localColors" :section-fields="sectionFields" />
      </template>
      <template v-else-if="settingKey === 'labels'">
        <SectionLabelsForm v-model="localLabels" />
      </template>
      <template v-else-if="settingKey === 'columns'">
        <SectionColumnsForm v-model="localColumns" :section-fields="sectionFields" />
      </template>
      <template v-else>
        <p class="section-modal-placeholder">Дополнительные настройки для этой секции отсутствуют.</p>
      </template>

      <div class="modal-actions-buttons">
        <button v-if="settingKey === 'color' || settingKey === 'columns'" type="button" class="btn btn-reset" @click="onResetClick">Сбросить</button>
        <button type="button" class="btn btn-cancel" @click="close">Отменить</button>
        <button type="button" class="btn btn-apply" @click="apply">Применить</button>
      </div>
    </div>
  </ModalCenter>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { MoveRight, MoveUp, PaintBucket, Type } from 'lucide-vue-next'
import ModalCenter from '@/components/ModalCenter.vue'
import SectionAxisXForm from './ChartSectionSettings/SectionAxisXForm.vue'
import SectionAxisYForm from './ChartSectionSettings/SectionAxisYForm.vue'
import SectionColorForm from './ChartSectionSettings/SectionColorForm.vue'
import SectionLabelsForm from './ChartSectionSettings/SectionLabelsForm.vue'
import SectionColumnsForm from './ChartSectionSettings/SectionColumnsForm.vue'
import SectionColorTableForm from './ChartSectionSettings/SectionColorTableForm.vue'
import { defaultSectionAxis, defaultSectionAxisYExtras, defaultSectionColors, defaultSectionLabels, defaultSectionColumns } from './ChartSectionSettings/sectionDefaults.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  settingKey: { type: String, default: '' },
  setting: { type: Object, default: null },
  chartType: { type: String, default: '' },
  sectionOptions: {
    type: Object,
    default: () => ({}),
  },
  sectionFields: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:visible', 'apply'])

const chartTypeNorm = computed(() => (props.chartType || '').toLowerCase().trim())

const modalTitle = computed(() => {
  if (props.settingKey === 'x') return 'X'
  if (props.settingKey === 'y') return 'Y'
  if (props.settingKey === 'y2') return 'Y2'
  if (props.settingKey === 'color') return 'Настройки цветов'
  if (props.settingKey === 'labels') return 'Подписи'
  if (props.settingKey === 'columns') return 'Настройка столбцов'
  return props.setting?.label ?? 'Настройки'
})

const sectionIcon = computed(() => {
  if (props.settingKey === 'x') return MoveRight
  if (props.settingKey === 'y' || props.settingKey === 'y2') return MoveUp
  if (props.settingKey === 'color') return PaintBucket
  if (props.settingKey === 'labels') return Type
  return props.setting?.icon ?? null
})

const localAxis = ref({ ...defaultSectionAxis })
const localColors = ref({ ...defaultSectionColors })
const localLabels = ref({ ...defaultSectionLabels })
const localColumns = ref({ ...defaultSectionColumns })

function syncFromProps() {
  if (!props.visible) return
  const opts = props.sectionOptions || {}
  if (props.settingKey === 'x') {
    localAxis.value = { ...defaultSectionAxis, ...opts }
  } else if (props.settingKey === 'y' || props.settingKey === 'y2') {
    localAxis.value = { ...defaultSectionAxis, ...defaultSectionAxisYExtras, ...opts }
  } else if (props.settingKey === 'color') {
    localColors.value = { ...defaultSectionColors, ...opts }
  } else if (props.settingKey === 'labels') {
    localLabels.value = { ...defaultSectionLabels, ...opts }
  } else if (props.settingKey === 'columns') {
    localColumns.value = { ...defaultSectionColumns, ...opts }
  }
}

watch(
  () => [props.visible, props.settingKey, props.sectionOptions],
  () => {
    if (props.visible) syncFromProps()
  },
  { immediate: true }
)

function close() {
  emit('update:visible', false)
}

function apply() {
  if (props.settingKey === 'x' || props.settingKey === 'y' || props.settingKey === 'y2') {
    emit('apply', { ...localAxis.value })
  } else if (props.settingKey === 'color') {
    emit('apply', { ...localColors.value })
  } else if (props.settingKey === 'labels') {
    emit('apply', { ...localLabels.value })
  } else if (props.settingKey === 'columns') {
    emit('apply', { ...localColumns.value })
  } else {
    emit('apply', {})
  }
  close()
}

function onResetClick() {
  if (props.settingKey === 'color') {
    localColors.value = { ...defaultSectionColors }
  } else if (props.settingKey === 'columns') {
    localColumns.value = { ...defaultSectionColumns }
  }
}
</script>

<style lang="scss" scoped>
.section-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-modal-title-icon {
  color: var(--color-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.section-modal-placeholder {
  color: var(--color-secondary-text);
  margin: 0;
  padding: 1rem 0;
}

.modal-actions-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid var(--color-secondary-background);
  justify-content: flex-end;
}

.btn-reset {
  margin-right: auto;
  background: transparent;
  color: var(--color-secondary-text);
  border-radius: 6px;

  &:hover:not(:disabled) {
    background-color: var(--color-hover-background);
  }
}

.btn-cancel {
  background-color: var(--color-primary-background);
  color: var(--color-primary-text);
  border-radius: 6px;

  &:hover:not(:disabled) {
    background-color: var(--color-hover-background);
  }
}

.btn-apply {
  background-color: #0b5ed7;
  color: white;
  border-radius: 6px;

  &:hover:not(:disabled) {
    background-color: #0a4b9a;
  }
}

:deep(.chart-section-settings-modal-dialog) {
  max-width: 720px;
}
</style>
