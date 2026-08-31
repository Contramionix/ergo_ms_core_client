<template>
  <div class="toggle-switch" :class="{ 'toggle-switch--on': modelValue, 'toggle-switch--disabled': disabled, }">
    <button :id="controlId" type="button" class="toggle-switch__control" role="switch" :aria-checked="modelValue" :aria-label="resolvedAriaLabel" :disabled="disabled" @click="onActivate" @keydown.enter.prevent="onActivate" @keydown.space.prevent="onActivate">
      <span class="toggle-switch__track" aria-hidden="true">
        <span class="toggle-switch__thumb" />
      </span>
    </button>
    <label v-if="label" class="toggle-switch__label" :for="controlId">
      {{ label }}
    </label>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  /**
   * Родитель сам меняет modelValue (например, 3-state cycle в ролевых политиках).
   * Клик только эмитит activate.
   */
  manual: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'activate'])

const generatedId = useId()
const controlId = computed(() => props.id || generatedId)
const resolvedAriaLabel = computed(() => props.ariaLabel || props.label || undefined)

function onActivate() {
  if (props.disabled) return
  if (props.manual) {
    emit('activate')
    return
  }
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped lang="scss">
.toggle-switch {
  --ios-toggle-track-off: color-mix(in srgb, var(--bs-body-color) 16%, var(--bs-body-bg));
  --ios-toggle-track-on: var(--ui-success, #34c759);
  --ios-toggle-thumb: #ffffff;
  --ios-toggle-thumb-shadow:
    0 2px 6px rgba(0, 0, 0, 0.2),
    0 1px 1px rgba(0, 0, 0, 0.12);

  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
}

.toggle-switch__control {
  display: inline-flex;
  align-items: center;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 0;

  &:disabled {
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--bs-primary, var(--color-accent));
    outline-offset: 2px;
    border-radius: 999px;
  }
}

.toggle-switch__track {
  position: relative;
  display: block;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background-color: var(--ios-toggle-track-off);
  transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: var(--ios-toggle-thumb);
  box-shadow: var(--ios-toggle-thumb-shadow);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-switch--on {
  .toggle-switch__track {
    background-color: var(--ios-toggle-track-on);
  }

  .toggle-switch__thumb {
    transform: translateX(18px);
  }
}

.toggle-switch--disabled {
  opacity: 0.55;
  pointer-events: none;
}

.toggle-switch__label {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-secondary-text, var(--ui-text-muted));
  cursor: pointer;
  user-select: none;
}

.toggle-switch--disabled .toggle-switch__label {
  cursor: not-allowed;
}
</style>