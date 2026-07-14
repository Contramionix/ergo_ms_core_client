<template>
  <div
    class="search-input"
    :class="[
      `search-input--layout-${layout}`,
      { 'search-input--no-icon': !showIcon },
      `search-input--bg-${background}`,
      `search-input--focus-${focusBorder}`,
    ]"
  >
    <label v-if="label" :for="inputId" class="form-label mb-1">{{ label }}</label>
    <div class="search-input__wrap">
      <LucideIcon
        v-if="showIcon"
        name="Search"
        :size="iconSize"
        class="search-input__icon"
        icon-class="search-input__icon"
      />
      <input
        :id="inputId"
        :value="modelValue"
        :type="inputType"
        class="form-control search-input__control"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="ariaLabel"
        @input="onInput"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue'
import LucideIcon from '@/components/LucideIcon.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Поиск...',
  },
  label: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  inputType: {
    type: String,
    default: 'search',
  },
  showIcon: {
    type: Boolean,
    default: false,
  },
  background: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary'].includes(value),
  },
  focusBorder: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary'].includes(value),
  },
  layout: {
    type: String,
    default: 'grow',
    validator: (value) => ['grow', 'fixed'].includes(value),
  },
})

const emit = defineEmits(['update:modelValue', 'input', 'focus', 'blur'])

const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
const ariaLabel = computed(() => props.label || props.placeholder)
const iconSize = 16

function onInput(event) {
  const value = event?.target?.value ?? ''
  emit('update:modelValue', value)
  emit('input', value)
}
</script>

<style scoped lang="scss">
.search-input {
  --search-input-height: 38px;
  --search-input-font-size: inherit;
  --search-input-icon-size: 16px;
  --search-input-border-radius: 6px;
  --search-input-padding-start: 40px;
  --search-input-padding-start-no-icon: 0.75rem;

  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;

  &--layout-grow {
    flex: 1 1 auto;
    min-width: 200px;
  }

  &--layout-fixed {
    flex: 0 1 280px;
    min-width: 180px;
  }

  &__wrap {
    position: relative;
    width: 100%;
  }

  &__icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--bs-secondary-color);
    pointer-events: none;
    z-index: 1;
  }

  &__control {
    width: 100%;
    box-sizing: border-box;
    height: var(--search-input-height);
    font-size: var(--search-input-font-size);
    border-radius: var(--search-input-border-radius);
    border: 1px solid var(--color-border);
    color: var(--color-primary-text);

    &::placeholder {
      color: var(--color-secondary-text);
    }
  }

  &:not(.search-input--no-icon) .search-input__control {
    padding-left: var(--search-input-padding-start);
  }

  &--no-icon .search-input__control {
    padding-left: var(--search-input-padding-start-no-icon);
  }

  &--bg-primary .search-input__control {
    background-color: var(--color-primary-background);
  }

  &--bg-secondary .search-input__control {
    background-color: var(--color-secondary-background);
    font-size: 0.875rem;
  }

  &--focus-primary .search-input__control:focus,
  &--focus-primary .search-input__control:focus-visible {
    border-color: var(--color-primary-text);
    box-shadow: none;
  }
}
</style>
