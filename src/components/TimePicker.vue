<template>
  <div ref="rootRef" class="time-picker" :class="{ 'time-picker--invalid': invalid }">
    <VueDatePicker :model-value="pickerTime" time-picker :text-input="textInputConfig" :formats="pickerFormats" :input-attrs="inputAttrs" :placeholder="resolvedPlaceholder" :time-config="timeConfig" auto-apply :teleport="true" :dark="isDark" :floating="floatingConfig" :config="pickerConfig" :disabled="disabled" @update:model-value="onPickerUpdate">
      <template #input-icon>
        <span class="time-picker__glyph">
          <LucideIcon name="Clock" :size="ICON_SIZE" aria-hidden="true" />
        </span>
      </template>
      <template #clear-icon="{ clear }">
        <HoverTooltip :text="t('components.timePicker.clear')">
          <button type="button" class="time-picker__glyph" :aria-label="t('components.timePicker.clear')" @click.stop="clear">
            <LucideIcon name="X" :size="ICON_SIZE" aria-hidden="true" />
          </button>
        </HoverTooltip>
      </template>
    </VueDatePicker>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useThemeMode } from '@/composables/useThemeMode.js'

const ICON_SIZE = 16
const TIME_PATTERN = /^(\d{1,2}):(\d{2})/
const MAX_TIME_DIGITS = 4
const TIME_ALLOWED_KEYS = new Set([
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Tab',
  'Enter',
  'Home',
  'End',
])

const rootRef = ref(null)

const pickerConfig = {
  allowPreventDefault: true,
}

const floatingConfig = {
  placement: 'bottom-start',
  offset: 4,
}

const timeConfig = {
  enableTimePicker: true,
  enableSeconds: false,
  is24: true,
}

const pickerFormats = {
  input: 'HH:mm',
}

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '',
  },
  invalid: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    default: '',
  },
  textInput: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useAppI18n()
const { isDark } = useThemeMode()

const resolvedPlaceholder = computed(() => props.placeholder || t('components.timePicker.placeholder'))

const textInputConfig = computed(() => {
  if (!props.textInput) return false
  return {
    format: 'HH:mm',
    applyOnBlur: true,
    enterSubmit: true,
    tabSubmit: true,
  }
})

const inputAttrs = computed(() => ({
  autocomplete: 'off',
  inputmode: props.textInput ? 'numeric' : 'none',
  ...(props.id ? { id: props.id } : {}),
}))

const pickerTime = computed(() => parseClock(props.modelValue))

function parseClock(value) {
  const match = String(value || '').trim().match(TIME_PATTERN)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

function formatClock(value) {
  if (!value || value.hours == null || value.minutes == null) return ''
  const hours = Number(value.hours)
  const minutes = Number(value.minutes)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return ''
  if (hours > 23 || minutes > 59) return ''
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function onPickerUpdate(value) {
  emit('update:modelValue', formatClock(value))
}

function isTimeInput(target) {
  return target instanceof HTMLInputElement && (
    target.classList.contains('dp__input') || target.classList.contains('dp--input')
  )
}

function timeDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, MAX_TIME_DIGITS)
}

function formatTimeDigits(digits) {
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function digitIndexFromCaret(caret, value) {
  return timeDigits(String(value ?? '').slice(0, caret)).length
}

function caretForDigitIndex(index) {
  if (index <= 2) return index
  return Math.min(index + 1, 5)
}

function writeTimeDigits(input, digits, caretDigitIndex) {
  const next = timeDigits(digits)
  input.value = formatTimeDigits(next)
  const caret = caretForDigitIndex(Math.min(caretDigitIndex, next.length))
  input.setSelectionRange(caret, caret)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function onKeydown(event) {
  if (!props.textInput) return
  if (!isTimeInput(event.target)) return
  if (event.ctrlKey || event.metaKey || event.altKey) return

  const input = event.target
  if (/^\d$/.test(event.key)) {
    event.preventDefault()
    const digits = timeDigits(input.value)
    const start = digitIndexFromCaret(input.selectionStart ?? input.value.length, input.value)
    const end = digitIndexFromCaret(input.selectionEnd ?? start, input.value)
    writeTimeDigits(input, `${digits.slice(0, start)}${event.key}${digits.slice(end)}`, start + 1)
    return
  }

  if (event.key === ':') {
    event.preventDefault()
    if (timeDigits(input.value).length >= 2) input.setSelectionRange(3, 3)
    return
  }

  if (TIME_ALLOWED_KEYS.has(event.key)) return
  event.preventDefault()
}

function onPaste(event) {
  if (!props.textInput) return
  if (!isTimeInput(event.target)) return
  event.preventDefault()
  const input = event.target
  const digits = timeDigits(input.value)
  const pasted = timeDigits(event.clipboardData?.getData('text') ?? '')
  const start = digitIndexFromCaret(input.selectionStart ?? input.value.length, input.value)
  const end = digitIndexFromCaret(input.selectionEnd ?? start, input.value)
  const next = `${digits.slice(0, start)}${pasted}${digits.slice(end)}`
  writeTimeDigits(input, next, start + pasted.length)
}

function onInput(event) {
  if (!props.textInput) return
  if (!isTimeInput(event.target)) return
  const input = event.target
  const formatted = formatTimeDigits(timeDigits(input.value))
  if (input.value === formatted) return
  const caret = digitIndexFromCaret(input.selectionStart ?? input.value.length, input.value)
  writeTimeDigits(input, input.value, caret)
}

onMounted(() => {
  const el = rootRef.value
  if (!el) return
  el.addEventListener('keydown', onKeydown)
  el.addEventListener('paste', onPaste)
  el.addEventListener('input', onInput)
})

onBeforeUnmount(() => {
  const el = rootRef.value
  if (!el) return
  el.removeEventListener('keydown', onKeydown)
  el.removeEventListener('paste', onPaste)
  el.removeEventListener('input', onInput)
})
</script>

<style scoped lang="scss">
@import '@/scss/vue-datepicker-theme';

.time-picker {
  --time-picker-icon-gap: 0.75rem;
  --time-picker-icon-size: 1rem;
  --time-picker-pad-inline: calc(
    var(--time-picker-icon-gap) + var(--time-picker-icon-size) + var(--time-picker-icon-gap)
  );
  --time-picker-pad-start: calc(var(--time-picker-pad-inline) - 0.375rem);

  width: 100%;

  @include vue-datepicker-theme;

  :deep(.dp__input),
  :deep(.dp--input) {
    box-sizing: border-box;
    height: 38px;
    min-height: 38px;
    padding-block: 0.375rem;
    padding-inline: var(--time-picker-pad-start) var(--time-picker-pad-inline);
    font-size: 1rem;
    line-height: 1.5;
    background: var(--color-primary-background);
    color: var(--color-primary-text);
    border: 1px solid var(--color-border);
    border-radius: var(--bs-border-radius, 0.5rem);
    box-shadow: none;

    &:hover {
      border-color: var(--color-border);
    }

    &:focus,
    &:focus-visible,
    &.dp__input_focus,
    &.dp--input-focus {
      outline: none;
      background: var(--color-primary-background);
      border-color: var(--ui-accent, var(--color-accent, var(--bs-primary)));
      box-shadow: none;
    }

    &::placeholder {
      color: var(--color-secondary-text);
      opacity: 0.75;
    }
  }

  :deep(.dp__input_icon_pad),
  :deep(.dp--input-icon-pad) {
    padding-left: var(--time-picker-pad-start);
    padding-right: var(--time-picker-pad-inline);
    padding-inline-start: var(--time-picker-pad-start);
    padding-inline-end: var(--time-picker-pad-inline);
  }

  :deep(.dp__input_icon),
  :deep(.dp--input-icon),
  :deep(.dp--clear-btn) {
    position: absolute;
    top: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--time-picker-icon-size);
    height: var(--time-picker-icon-size);
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    transform: translateY(-50%);
    color: var(--color-secondary-text);
    cursor: pointer;
    transition: color 0.15s ease;

    &:hover {
      color: var(--color-accent, var(--bs-primary));
    }
  }

  :deep(.dp__input_icon),
  :deep(.dp--input-icon) {
    left: var(--time-picker-icon-gap);
    right: auto;
    inset-inline-start: var(--time-picker-icon-gap);
    inset-inline-end: auto;
  }

  :deep(.dp--clear-btn) {
    left: auto;
    right: var(--time-picker-icon-gap);
    inset-inline-start: auto;
    inset-inline-end: var(--time-picker-icon-gap);
  }

  :deep(.dp--clear-btn:focus-visible) {
    outline: 2px solid var(--color-primary-text);
    outline-offset: 1px;
  }
}

:deep(.hover-tooltip) {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
}

.time-picker__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  line-height: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;

  :deep(svg) {
    display: block;
    width: 1rem;
    height: 1rem;
  }
}

.time-picker--invalid :deep(.dp__input),
.time-picker--invalid :deep(.dp--input) {
  border-color: var(--bs-form-invalid-border-color, var(--bs-danger, #dc3545));
}
</style>

<style lang="scss">
@import '@/scss/vue-datepicker-theme';

@include vue-datepicker-overlay-theme;
</style>
