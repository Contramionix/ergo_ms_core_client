<template>
  <div class="section-color-form">
    <div class="section-color-form-grid">
      <div class="section-color-form-left">
        <input v-model="searchQuery" type="text" class="form-control form-control-sm section-color-search" placeholder="Поиск по имени и описанию" />
        <div class="section-color-field-list">
          <div
            v-for="f in filteredFields"
            :key="f.id ?? f.name"
            class="section-color-field-item"
            :class="{ active: selectedFieldId === (f.id ?? f.name) }"
            @click="selectedFieldId = f.id ?? f.name"
          >
            <Type size="16" class="section-color-field-icon" />
            <span class="section-color-field-name">{{ f.displayName ?? f.name }}</span>
          </div>
        </div>
      </div>
      <div class="section-color-form-right">
        <div class="section-color-form-row">
          <label class="section-color-form-label">Палитра</label>
          <select v-model="model.palette" class="form-select form-select-sm section-color-palette-select">
            <option v-for="opt in PALETTE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="section-color-swatches">
          <button
            v-for="(color, i) in paletteColors"
            :key="i"
            type="button"
            class="section-color-swatch"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="onSwatchClick(color)"
          />
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary section-color-auto-btn" @click="setAuto">AUTO</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Type } from 'lucide-vue-next'

const PALETTE_OPTIONS = [
  { value: 'classic20', label: 'По умолчанию Classic 20' },
  { value: 'classic10', label: 'Classic 10' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'vivid', label: 'Vivid' },
]

const CLASSIC_20 = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#5470c6',
  '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272',
  '#fc8452', '#9a60b4', '#ea7ccc', '#5470c6', '#91cc75',
]

const props = defineProps({
  modelValue: { type: Object, required: true },
  sectionFields: { type: Array, default: () => [] },
})

const model = defineModel({ type: Object, required: true })

const searchQuery = ref('')
const selectedFieldId = ref(null)

const filteredFields = computed(() => {
  const q = (searchQuery.value || '').toLowerCase()
  if (!q) return props.sectionFields
  return props.sectionFields.filter((f) => {
    const name = (f.displayName ?? f.name ?? '').toLowerCase()
    const desc = (f.description ?? '').toLowerCase()
    return name.includes(q) || desc.includes(q)
  })
})

const paletteColors = computed(() => {
  if (model.value.palette === 'classic20') return CLASSIC_20
  if (model.value.palette === 'classic10') return CLASSIC_20.slice(0, 10)
  return CLASSIC_20
})

function onSwatchClick(color) {
  if (!selectedFieldId.value) return
  model.value = {
    ...model.value,
    customColors: { ...model.value.customColors, [selectedFieldId.value]: color },
  }
}

function setAuto() {
  model.value = { ...model.value, auto: true }
}
</script>

<style lang="scss" scoped>
.section-color-form {
  min-height: 200px;
}

.section-color-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.section-color-form-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.section-color-search {
  width: 100%;
}

.section-color-field-list {
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
  border: 1px solid var(--color-secondary-background);
  border-radius: 6px;
  padding: 4px;
}

.section-color-field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-primary-text);

  &.active {
    background: #0b5ed7;
    color: white;
  }

  &:hover:not(.active) {
    background: var(--color-hover-background);
  }
}

.section-color-field-icon {
  flex-shrink: 0;
  color: var(--color-accent);
}

.section-color-field-item.active .section-color-field-icon {
  color: inherit;
}

.section-color-field-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-color-form-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.section-color-form-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .section-color-form-label {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-secondary-text);
  }
}

.section-color-palette-select {
  flex: 1;
  min-width: 0;
}

.section-color-swatches {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.section-color-swatch {
  aspect-ratio: 1;
  border: 1px solid var(--color-secondary-background);
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  min-width: 24px;
  min-height: 24px;
}

.section-color-auto-btn {
  align-self: flex-start;
}
</style>
