<template>
  <div v-if="!props.dataset" class="fields-placeholder">
    <div class="alert alert-info info-box"><CircleAlert :size="40" class="me-1" />Прежде чем увидеть содержимое, добавьте датасет</div>
  </div>
  <div v-else class="fields-scroll">
    <ul class="fields-list">
      <li v-for="f in props.fields" :key="f.id || f.name" class="field-item">
        <span class="field-icon" :class="iconVariantClass">
          <component :is="getFieldIcon(f)" size="16" />
        </span>
        <span class="field-name">{{ f.displayName ?? f.name ?? f.title ?? 'Без имени' }}</span>
        <div class="field-item-actions">
          <button v-if="showFormulaButton(f)" type="button" class="action-btn formula-btn" title="Формула" @click.stop="emit('openFormula', { field: f })"><SquareFunction size="16" /></button>
          <div class="dropdown-wrap">
            <button type="button" class="action-btn more-btn" title="Ещё" aria-haspopup="true" :aria-expanded="openDropdownId === (f.id ?? f.name)" @click.stop="toggleDropdown(f, $event)"><MoreHorizontal size="16" /></button>
          </div>
        </div>
      </li>
      <li v-if="!props.fields || !props.fields.length" class="field-empty">
        <i>{{ emptyMessage }}</i>
      </li>
    </ul>
  </div>
  <Teleport to="body">
    <Transition name="dropdown-menu">
      <div v-if="openDropdownId && dropdownField" class="field-dropdown field-dropdown--fixed" :style="dropdownStyle" @click.stop>
        <button v-for="(item, idx) in visibleDropdownItems" :key="idx" type="button" class="dropdown-item" :class="{ 'dropdown-item--danger': item.danger }" @click="onDropdownItemClick(item)">
          {{ item.label }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { CircleAlert, SquareFunction, MoreHorizontal } from 'lucide-vue-next'
import { isVirtualMeasureField } from '../js/measureVirtualFields.js'
import { getFieldIcon } from '../js/fieldIcons.js'
import { MEASURE_COLOR, PARAMETER_ICON_COLOR } from '@/core/bi/Datasets/Fields/js/fieldTypeDisplay.js'

const measureColor = MEASURE_COLOR
const parameterColor = PARAMETER_ICON_COLOR

const props = defineProps({
  dataset: Object,
  fields: { type: Array, default: () => [] },
  emptyMessage: { type: String, default: 'Не найдено' },
  showFormula: { type: Boolean, default: false },
  iconVariant: { type: String, default: 'default' },
  dropdownItems: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['openFormula', 'duplicate', 'removeDuplicate', 'editParameter'])

const openDropdownId = ref(null)
const dropdownField = ref(null)
const dropdownRect = ref(null)

const DROPDOWN_MIN_WIDTH = 140

const iconVariantClass = computed(() => {
  if (props.iconVariant === 'measures') return 'field-icon--measures'
  if (props.iconVariant === 'parameters') return 'field-icon--parameters'
  return ''
})

function showFormulaButton(f) {
  if (!props.showFormula) return false
  return !isVirtualMeasureField(f)
}

const visibleDropdownItems = computed(() => {
  const field = dropdownField.value
  if (!field || !Array.isArray(props.dropdownItems)) return []
  return props.dropdownItems.filter((item) => (typeof item.visible === 'function' ? item.visible(field) : true))
})

const dropdownStyle = computed(() => {
  const r = dropdownRect.value
  if (!r) return {}
  return {
    position: 'fixed',
    top: `${r.bottom + 2}px`,
    left: `${Math.max(4, r.right - DROPDOWN_MIN_WIDTH)}px`,
    minWidth: `${DROPDOWN_MIN_WIDTH}px`,
  }
})

function toggleDropdown(f, event) {
  const id = f.id ?? f.name
  if (openDropdownId.value === id) {
    closeDropdown()
    return
  }
  const btn = event?.currentTarget
  dropdownRect.value = btn && typeof btn.getBoundingClientRect === 'function' ? btn.getBoundingClientRect() : null
  dropdownField.value = f
  openDropdownId.value = id
}

function closeDropdown() {
  openDropdownId.value = null
  dropdownField.value = null
  dropdownRect.value = null
}

function onDropdownItemClick(item) {
  const field = dropdownField.value
  if (field && item.event) emit(item.event, field)
  closeDropdown()
}

function handleClickOutside(event) {
  if (event.target?.closest?.('.field-dropdown') || event.target?.closest?.('.more-btn')) return
  closeDropdown()
}

function handleEscape(event) {
  if (event.key === 'Escape') closeDropdown()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped lang="scss">
.fields-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
}

.fields-placeholder {
  height: 100%;
}

.info-box {
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  text-align: center;
  gap: 10px;
  padding: 12px;
  font-size: 0.95rem;
  line-height: 1.3;
}

.fields-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  min-width: 0;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--color-primary-text);
  transition: background 0.2s;
}

.field-item:hover {
  background: var(--color-hover-background);
}

.field-icon {
  color: var(--color-accent);
}

.field-icon--measures {
  color: v-bind(measureColor);
}

.field-icon--parameters {
  color: v-bind(parameterColor);
}

.field-name {
  font-weight: 500;
  flex: 1 1 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  max-width: 0;
  margin-left: 0;
  overflow: visible;
  opacity: 0;
  transition: max-width 0.2s, margin-left 0.2s, opacity 0.15s;
}

.field-item:hover .field-item-actions {
  max-width: 72px;
  margin-left: 6px;
  opacity: 1;
}

.field-item .action-btn {
  color: var(--color-secondary-text);
  cursor: pointer;
  background: none;
  border: none;
  padding: 2px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.field-item .action-btn:hover {
  color: var(--color-accent);
}

.field-item:has(.field-icon--measures) .action-btn:hover {
  color: v-bind(measureColor);
}

.field-item:has(.field-icon--parameters) .action-btn:hover {
  color: v-bind(parameterColor);
}

.dropdown-wrap {
  position: relative;
}

.field-dropdown {
  min-width: 140px;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border, #dee2e6);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  padding: 4px 0;
}

.field-dropdown--fixed {
  z-index: 1050;
}

.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  font-size: 14px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-primary-text);
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--color-hover-background);
}

.dropdown-item--danger:hover {
  color: var(--color-danger, #dc3545);
}

.dropdown-menu-enter-active,
.dropdown-menu-leave-active {
  transition: opacity 0.15s ease;
}

.dropdown-menu-enter-from,
.dropdown-menu-leave-to {
  opacity: 0;
}

.field-empty {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-secondary-text);
  padding: 24px 0;
}

:deep(.info-box svg) {
  display: block;
}

@media (max-width: 575.98px) {
  .info-box {
    padding: 10px;
    gap: 8px;
    font-size: 0.9rem;
    line-height: 1.25;
  }

  :deep(.info-box svg) {
    width: 28px;
    height: 28px;
  }
}

@media (min-width: 576px) and (max-width: 767.98px) {
  .info-box {
    gap: 10px;
    font-size: 0.95rem;
    line-height: 1.3;
  }

  :deep(.info-box svg) {
    width: 32px;
    height: 32px;
  }
}

@media (min-width: 768px) and (max-width: 991.98px) {
  .info-box {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    font-size: 1rem;
    line-height: 1.35;
  }

  :deep(.info-box svg) {
    width: 36px;
    height: 36px;
  }
}

@media (min-width: 992px) {
  .info-box {
    flex-direction: column;
    text-align: center;
    gap: 6px;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  :deep(.info-box svg) {
    width: 40px;
    height: 40px;
  }
}
</style>