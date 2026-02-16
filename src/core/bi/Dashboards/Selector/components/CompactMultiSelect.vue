<template>
  <div class="compact-multi-select" ref="rootRef">
    <button
      type="button"
      class="compact-select-trigger"
      :class="inputClasses"
      @click="toggleDropdown"
    >
      <span class="compact-select-text">{{ displayText }}</span>
      <span v-if="selectedCount > 0" class="compact-select-badge">{{ selectedCount }}</span>
      <ChevronDown :size="16" class="compact-select-arrow" />
    </button>
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="compact-select-dropdown"
        :style="dropdownStyle"
        ref="dropdownRef"
      >
        <div class="compact-select-list" ref="listRef">
          <label
            v-for="option in options"
            :key="option.value"
            class="compact-select-option"
            :class="{ 'selected': isSelected(option.value) }"
          >
            <input
              v-if="multiple"
              type="checkbox"
              :checked="isSelected(option.value)"
              @change="toggleOption(option.value)"
            />
            <input
              v-else
              type="radio"
              :checked="isSelected(option.value)"
              @change="selectSingle(option.value)"
            />
            <span class="compact-select-option-label">{{ option.label }}</span>
          </label>
          <div v-if="options.length === 0" class="compact-select-empty">
            Нет доступных значений
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps({
  options: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: [Array, String],
    default: () => []
  },
  multiple: {
    type: Boolean,
    default: true
  },
  placeholder: {
    type: String,
    default: 'Нет выбранных значений'
  },
  withColorAccent: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const rootRef = ref(null);
const dropdownRef = ref(null);
const listRef = ref(null);
const isOpen = ref(false);
const dropdownStyle = ref({});

const selectedArray = computed(() => {
  const v = props.modelValue;
  return Array.isArray(v) ? v : (v != null && v !== '' ? [v] : []);
});

const selectedCount = computed(() => selectedArray.value.length);

const displayText = computed(() => {
  if (selectedArray.value.length === 0) return props.placeholder;
  if (selectedArray.value.length === 1) {
    const opt = props.options.find(o => String(o.value) === String(selectedArray.value[0]));
    return opt ? opt.label : selectedArray.value[0];
  }
  return selectedArray.value.map(val => {
    const opt = props.options.find(o => String(o.value) === String(val));
    return opt ? opt.label : val;
  }).join(', ');
});

const inputClasses = computed(() => ({
  'with-color-accent': props.withColorAccent
}));

function isSelected(value) {
  return selectedArray.value.some(v => String(v) === String(value));
}

function toggleOption(value) {
  const strVal = String(value);
  const current = selectedArray.value.map(String);
  const idx = current.indexOf(strVal);
  let next;
  if (idx >= 0) {
    next = selectedArray.value.filter((_, i) => i !== idx);
  } else {
    next = [...selectedArray.value, value];
  }
  emit('update:modelValue', next);
}

function selectSingle(value) {
  emit('update:modelValue', value);
  isOpen.value = false;
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(updateDropdownPosition);
  }
}

function updateDropdownPosition() {
  if (!rootRef.value || !dropdownRef.value) return;
  const rect = rootRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 200)}px`,
    zIndex: '10000'
  };
}

function handleClickOutside(event) {
  if (!rootRef.value || !dropdownRef.value) return;
  const el = rootRef.value;
  const dropdown = dropdownRef.value;
  if (!el.contains(event.target) && !dropdown.contains(event.target)) {
    isOpen.value = false;
  }
}

function handleKeyDown(event) {
  if (event.key === 'Escape') {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});

watch(isOpen, (open) => {
  if (open) {
    nextTick(updateDropdownPosition);
  }
});
</script>

<style scoped lang="scss">
.compact-multi-select {
  position: relative;
  width: 100%;
  min-width: 0;
}

.compact-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  min-height: 36px;
  box-sizing: border-box;

  &:hover {
    border-color: var(--color-primary);
  }

  &.with-color-accent {
    border-color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.05);
  }
}

.compact-select-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-select-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
}

.compact-select-arrow {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}

.compact-select-dropdown {
  position: fixed;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  max-height: 200px;
  overflow-y: auto;
}

.compact-select-list {
  padding: 4px 0;
}

.compact-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-primary);

  &:hover {
    background: var(--color-hover-background);
  }

  &.selected {
    background: rgba(var(--color-primary-rgb), 0.1);
  }

  input[type="checkbox"],
  input[type="radio"] {
    accent-color: var(--color-primary);
    flex-shrink: 0;
  }
}

.compact-select-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compact-select-empty {
  padding: 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
  text-align: center;
}
</style>
