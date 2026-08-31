<template>
  <div class="tri-state-switch" :class="[ `tri-state-switch--${modelValue}`, { 'tri-state-switch--disabled': disabled }, ]">
    <button :id="controlId" type="button" class="tri-state-switch__control" role="slider" :aria-valuemin="0" :aria-valuemax="2" :aria-valuenow="valueIndex" :aria-valuetext="valueText" :aria-label="resolvedAriaLabel" :disabled="disabled" @click="onTrackClick" @keydown.left.prevent="move(-1)" @keydown.down.prevent="move(-1)" @keydown.right.prevent="move(1)" @keydown.up.prevent="move(1)" @keydown.home.prevent="setValue(VALUES[0])" @keydown.end.prevent="setValue(VALUES[2])">
      <span class="tri-state-switch__track" aria-hidden="true">
        <span class="tri-state-switch__mark tri-state-switch__mark--deny">
          <X :size="12" />
        </span>
        <span class="tri-state-switch__mark tri-state-switch__mark--allow">
          <Check :size="12" />
        </span>
        <span class="tri-state-switch__thumb">
          <X v-if="modelValue === 'deny'" :size="13" />
          <Check v-else-if="modelValue === 'allow'" :size="13" />
        </span>
      </span>
    </button>
    <label v-if="label" class="tri-state-switch__label" :for="controlId">
      {{ label }}
    </label>
  </div>
</template>

<script>
const VALUES = ['deny', 'inherit', 'allow']

const VALUE_TEXT = {
  deny: 'Запрещено',
  inherit: 'Не задано',
  allow: 'Разрешено',
}
</script>

<script setup>
import { computed, useId } from 'vue'
import { Check, X } from '@lucide/vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'inherit',
    validator: (value) => VALUES.includes(value),
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
})

const emit = defineEmits(['update:modelValue'])

const generatedId = useId()
const controlId = computed(() => props.id || generatedId)
const valueIndex = computed(() => Math.max(0, VALUES.indexOf(props.modelValue)))
const valueText = computed(() => VALUE_TEXT[props.modelValue] || VALUE_TEXT.inherit)
const resolvedAriaLabel = computed(() => props.ariaLabel || props.label || valueText.value)

function setValue(next) {
  if (props.disabled || next === props.modelValue) return
  emit('update:modelValue', next)
}

function move(step) {
  const nextIndex = Math.min(VALUES.length - 1, Math.max(0, valueIndex.value + step))
  setValue(VALUES[nextIndex])
}

function onTrackClick(event) {
  if (props.disabled) return
  const rect = event.currentTarget.getBoundingClientRect()
  if (!rect.width) return
  const ratio = (event.clientX - rect.left) / rect.width
  if (ratio < 1 / 3) {
    setValue('deny')
    return
  }
  if (ratio > 2 / 3) {
    setValue('allow')
    return
  }
  setValue('inherit')
}
</script>

<style scoped lang="scss">
.tri-state-switch {
  --ios-toggle-track-off: color-mix(in srgb, var(--bs-body-color) 16%, var(--bs-body-bg));
  --ios-toggle-track-on: var(--ui-success, #34c759);
  --ios-toggle-track-deny: var(--ui-danger, #ff3b30);
  --ios-toggle-thumb: #ffffff;
  --ios-toggle-thumb-shadow:
    0 2px 6px rgba(0, 0, 0, 0.2),
    0 1px 1px rgba(0, 0, 0, 0.12);

  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
}

.tri-state-switch__control {
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

.tri-state-switch__track {
  position: relative;
  display: block;
  width: 68px;
  height: 26px;
  border-radius: 999px;
  background-color: var(--ios-toggle-track-off);
  transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.tri-state-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: var(--ios-toggle-thumb);
  box-shadow: var(--ios-toggle-thumb-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bs-secondary-color, #8e8e93);
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.2s ease;
  z-index: 1;
}

.tri-state-switch__mark {
  position: absolute;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.2s ease;

  &--deny {
    left: 2px;
    color: var(--ios-toggle-track-deny);
  }

  &--allow {
    right: 2px;
    color: var(--ios-toggle-track-on);
  }
}

.tri-state-switch--deny {
  .tri-state-switch__track {
    background-color: var(--ios-toggle-track-deny);
  }

  .tri-state-switch__thumb {
    transform: translateX(0);
    color: var(--ios-toggle-track-deny);
  }

  .tri-state-switch__mark--deny {
    opacity: 0;
  }

  .tri-state-switch__mark--allow {
    color: #ffffff;
  }
}

.tri-state-switch--inherit {
  .tri-state-switch__thumb {
    transform: translateX(21px);
  }
}

.tri-state-switch--allow {
  .tri-state-switch__track {
    background-color: var(--ios-toggle-track-on);
  }

  .tri-state-switch__thumb {
    transform: translateX(42px);
    color: var(--ios-toggle-track-on);
  }

  .tri-state-switch__mark--allow {
    opacity: 0;
  }

  .tri-state-switch__mark--deny {
    color: #ffffff;
  }
}

.tri-state-switch--disabled {
  opacity: 0.55;
  pointer-events: none;
}

.tri-state-switch__label {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-secondary-text, var(--ui-text-muted));
  cursor: pointer;
  user-select: none;
}

.tri-state-switch--disabled .tri-state-switch__label {
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .tri-state-switch__track,
  .tri-state-switch__thumb,
  .tri-state-switch__mark {
    transition: none;
  }
}
</style>