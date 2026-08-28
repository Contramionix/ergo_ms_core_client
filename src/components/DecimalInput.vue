<template>
  <div class="decimal-input" :class="{ 'decimal-input--with-steppers': showSteppers }">
    <input :id="inputId" type="text" inputmode="decimal" class="form-control decimal-input__control" :class="inputClass" :value="modelValue ?? ''" :placeholder="placeholder" :disabled="disabled" :readonly="readonly" :aria-label="ariaLabel" @input="onInput" @focus="emit('focus', $event)" @blur="emit('blur', $event)" @keydown.enter="emit('enter', $event)"/>
    <div v-if="showSteppers" class="decimal-input__steppers">
      <button type="button" class="decimal-input__step" :disabled="steppersDisabled" aria-label="Увеличить" tabindex="-1" @click="stepBy(1)">
        <ChevronUp :size="14" aria-hidden="true" />
      </button>
      <button type="button" class="decimal-input__step" :disabled="steppersDisabled" aria-label="Уменьшить" tabindex="-1" @click="stepBy(-1)">
        <ChevronDown :size="14" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue'
import { ChevronUp, ChevronDown } from '@lucide/vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: undefined,
  },
  inputClass: {
    type: [String, Array, Object],
    default: '',
  },
  allowDecimal: {
    type: Boolean,
    default: true,
  },
  maxDecimalPlaces: {
    type: Number,
    default: null,
  },
  showSteppers: {
    type: Boolean,
    default: false,
  },
  step: {
    type: Number,
    default: 1,
  },
  min: {
    type: Number,
    default: undefined,
  },
  max: {
    type: Number,
    default: undefined,
  },
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'enter'])

const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
const steppersDisabled = computed(() => props.disabled || props.readonly)

function sanitizeDecimalInput(raw, { allowDecimal, maxDecimalPlaces } = {}) {
  let value = String(raw ?? '')
  if (!allowDecimal) {
    return value.replace(/\D/g, '')
  }

  value = value.replace(/[^\d.,]/g, '')
  let separator = ''
  let intPart = ''
  let fracPart = ''

  for (const ch of value) {
    if (ch === '.' || ch === ',') {
      if (!separator) {
        separator = ch
      }
      continue
    }
    if (!separator) {
      intPart += ch
    } else {
      fracPart += ch
    }
  }

  if (
    maxDecimalPlaces != null
    && Number.isFinite(maxDecimalPlaces)
    && maxDecimalPlaces >= 0
  ) {
    fracPart = fracPart.slice(0, maxDecimalPlaces)
  }

  if (!separator) {
    return intPart
  }
  return `${intPart}${separator}${fracPart}`
}

function preferredSeparator(raw) {
  const s = String(raw ?? '')
  if (s.includes(',')) return ','
  return '.'
}

function parseToNumber(raw) {
  const token = String(raw ?? '').trim().replace(',', '.')
  if (token === '' || token === '.' || token === ',') return null
  const num = Number(token)
  return Number.isFinite(num) ? num : null
}

function formatNumber(num, separator) {
  const text = String(num)
  if (separator === ',') {
    return text.replace('.', ',')
  }
  return text
}

function clamp(num) {
  let next = num
  if (props.min !== undefined && props.min !== null && Number.isFinite(props.min)) {
    next = Math.max(props.min, next)
  }
  if (props.max !== undefined && props.max !== null && Number.isFinite(props.max)) {
    next = Math.min(props.max, next)
  }
  return next
}

function emitSanitized(raw, eventTarget = null) {
  const cleaned = sanitizeDecimalInput(raw, {
    allowDecimal: props.allowDecimal,
    maxDecimalPlaces: props.maxDecimalPlaces,
  })
  if (eventTarget && eventTarget.value !== cleaned) {
    eventTarget.value = cleaned
  }
  emit('update:modelValue', cleaned)
  return cleaned
}

function onInput(event) {
  emitSanitized(event?.target?.value ?? '', event?.target)
}

function stepBy(direction) {
  if (steppersDisabled.value) return
  const step = Number(props.step)
  const delta = (Number.isFinite(step) && step !== 0 ? step : 1) * direction
  const current = parseToNumber(props.modelValue)
  const base = current == null ? 0 : current
  let next = clamp(base + delta)

  if (!props.allowDecimal) {
    next = Math.trunc(next)
  } else if (
    props.maxDecimalPlaces != null
    && Number.isFinite(props.maxDecimalPlaces)
    && props.maxDecimalPlaces >= 0
  ) {
    const factor = 10 ** props.maxDecimalPlaces
    next = Math.round(next * factor) / factor
  }

  const separator = preferredSeparator(props.modelValue)
  emit('update:modelValue', formatNumber(next, separator))
}
</script>

<style scoped lang="scss">
.decimal-input {
  display: inline-flex;
  align-items: stretch;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}

.decimal-input__control {
  min-width: 0;
  flex: 1 1 auto;
  background-color: var(--color-primary-background);
  border-color: var(--color-border);
  color: var(--color-primary-text);

  &::placeholder {
    color: var(--color-secondary-text);
  }
}

.decimal-input--with-steppers .decimal-input__control {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.decimal-input__steppers {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  border: 1px solid var(--color-border, var(--bs-border-color, #dee2e6));
  border-left: 0;
  border-radius: 0 var(--bs-border-radius, 0.375rem) var(--bs-border-radius, 0.375rem) 0;
  overflow: hidden;
  background: var(--color-primary-background);
}

.decimal-input__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 50%;
  margin: 0;
  padding: 0 0.2rem;
  border: 0;
  border-bottom: 1px solid var(--bs-border-color, #dee2e6);
  background: transparent;
  color: var(--bs-secondary-color, #6c757d);
  line-height: 1;
  cursor: pointer;
}

.decimal-input__step:last-child {
  border-bottom: 0;
}

.decimal-input__step:hover:not(:disabled) {
  background: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.04));
  color: var(--bs-body-color, inherit);
}

.decimal-input__step:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
