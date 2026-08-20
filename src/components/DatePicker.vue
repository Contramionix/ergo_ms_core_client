<template>
  <div ref="rootRef" class="date-picker" :class="{ 'date-picker--invalid': invalid }">
    <VueDatePicker :model-value="pickerDate" text-input :locale="pickerLocale" :formats="pickerFormats" :input-attrs="inputAttrs" :placeholder="resolvedPlaceholder" :time-config="timeConfig" auto-apply six-weeks :teleport="true" :floating="floatingConfig" :config="pickerConfig" :min-date="minDateParsed" :max-date="maxDateParsed" :disabled="disabled" @update:model-value="onPickerUpdate">
      <template #input-icon>
        <span class="date-picker__glyph">
          <LucideIcon name="Calendar" :size="ICON_SIZE" aria-hidden="true" />
        </span>
      </template>
      <template #clear-icon="{ clear }">
        <button type="button" class="date-picker__glyph" :aria-label="t('components.datePicker.clear')" @click.stop="clear">
          <LucideIcon name="X" :size="ICON_SIZE" aria-hidden="true" />
        </button>
      </template>
    </VueDatePicker>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { enUS } from 'date-fns/locale/en-US'
import { fr } from 'date-fns/locale/fr'
import { ru } from 'date-fns/locale/ru'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { advanceCaretToNextDateSection, applyDigitToDateInput, applyPastedDigitsToDateInput, normalizeDateInputMask, } from '@/js/utils/dateInputMask.js'
import { toISODate, toISODateTime } from '@/js/utils/timeUtils.js'

const DATE_CHARS_PATTERN = /[^\d.]/
const DATETIME_CHARS_PATTERN = /[^\d.:\s]/
const DATE_ALLOWED_KEYS = new Set([
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

const DATE_FNS_LOCALES = { ru, en: enUS, fr }
const ICON_SIZE = 16

const pickerConfig = {
  allowPreventDefault: true,
}

const floatingConfig = {
  placement: 'bottom-start',
  offset: 4,
}

const rootRef = ref(null)

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  minDate: {
    type: [String, Date],
    default: null,
  },
  maxDate: {
    type: [String, Date],
    default: null,
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
  enableTime: {
    type: Boolean,
    default: false,
  },
  timeFormat: {
    type: String,
    default: '24',
    validator: (value) => value === '12' || value === '24',
  },
})

const emit = defineEmits(['update:modelValue'])

const { t, getLocale } = useAppI18n()

const pickerLocale = computed(() => DATE_FNS_LOCALES[getLocale()] || ru)
const is12Hour = computed(() => props.enableTime && props.timeFormat === '12')
const useDigitMask = computed(() => !is12Hour.value)

const resolvedPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder
  if (!props.enableTime) return t('components.datePicker.placeholder')
  return is12Hour.value
    ? t('components.datePicker.placeholderDateTime12')
    : t('components.datePicker.placeholderDateTime')
})

const pickerFormats = computed(() => ({
  input: props.enableTime
    ? is12Hour.value
      ? 'dd.MM.yyyy hh:mm aa'
      : 'dd.MM.yyyy HH:mm'
    : 'dd.MM.yyyy',
}))

const timeConfig = computed(() => ({
  enableTimePicker: props.enableTime,
  enableSeconds: false,
  is24: !is12Hour.value,
}))

const pickerDate = computed(() => parseModelToDate(props.modelValue))

const inputAttrs = computed(() => ({
  inputmode: is12Hour.value ? 'text' : 'numeric',
  autocomplete: 'off',
  hideInputIcon: Boolean(pickerDate.value) && !props.disabled,
  ...(props.id ? { id: props.id } : {}),
}))

function parseModelToDate(value) {
  if (!value) return null
  if (props.enableTime) {
    const iso = toISODateTime(value)
    if (!iso) return null
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const iso = toISODate(value)
  if (!iso) return null
  const date = new Date(`${iso}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseBoundDate(value) {
  if (!value) return undefined
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  return parseModelToDate(value) ?? undefined
}

const minDateParsed = computed(() => parseBoundDate(props.minDate))
const maxDateParsed = computed(() => parseBoundDate(props.maxDate))

function onPickerUpdate(value) {
  if (value == null) {
    emit('update:modelValue', '')
    return
  }
  emit('update:modelValue', props.enableTime ? toISODateTime(value) : toISODate(value))
}

function isDateInputTarget(target) {
  return target instanceof HTMLInputElement && target.classList.contains('dp__input')
}

function onKeydown(event) {
  if (!useDigitMask.value) return
  if (!isDateInputTarget(event.target)) return
  if (event.ctrlKey || event.metaKey || event.altKey) return

  const input = event.target

  if (/^\d$/.test(event.key)) {
    event.preventDefault()
    applyDigitToDateInput(input, event.key, props.enableTime)
    return
  }

  if (event.key === '.' || (props.enableTime && (event.key === ':' || event.key === ' '))) {
    event.preventDefault()
    advanceCaretToNextDateSection(input, props.enableTime)
    return
  }

  if (DATE_ALLOWED_KEYS.has(event.key)) return
  event.preventDefault()
}

function onInput(event) {
  if (!useDigitMask.value) return
  if (!isDateInputTarget(event.target)) return
  const input = event.target
  if (normalizeDateInputMask(input, props.enableTime)) {
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

function onPaste(event) {
  if (!useDigitMask.value) return
  if (!isDateInputTarget(event.target)) return
  const pasted = event.clipboardData?.getData('text') ?? ''
  const invalidChars = props.enableTime ? DATETIME_CHARS_PATTERN : DATE_CHARS_PATTERN
  if (!invalidChars.test(pasted)) return

  event.preventDefault()
  applyPastedDigitsToDateInput(event.target, pasted, props.enableTime)
}

onMounted(() => {
  const el = rootRef.value
  if (!el) return
  el.addEventListener('keydown', onKeydown)
  el.addEventListener('input', onInput)
  el.addEventListener('paste', onPaste)
})

onBeforeUnmount(() => {
  const el = rootRef.value
  if (!el) return
  el.removeEventListener('keydown', onKeydown)
  el.removeEventListener('input', onInput)
  el.removeEventListener('paste', onPaste)
})
</script>

<style scoped lang="scss">
@import '@/scss/vue-datepicker-theme';

.date-picker {
  width: 100%;

  @include vue-datepicker-theme;

  :deep(.dp__input) {
    padding: 0.375rem 2.5rem 0.375rem 0.75rem;
    font-size: 1rem;
    line-height: 1.5;
    background: var(--color-primary-background);
    color: var(--color-primary-text);
    border: 1px solid var(--color-border);
    box-shadow: none;

    &:hover {
      border-color: var(--color-border);
    }

    &:focus,
    &:focus-visible {
      outline: none;
      background: var(--color-hover-background);
      border-color: var(--color-border);
      box-shadow: none;
    }

    &::placeholder {
      color: var(--color-secondary-text);
      opacity: 0.75;
    }
  }

  :deep(.dp__input_icon_pad) {
    padding-inline-start: 0.75rem;
    padding-inline-end: 2.5rem;
  }

  :deep(.dp__input_icon),
  :deep(.dp--clear-btn) {
    inset-inline-start: auto;
    inset-inline-end: 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    padding: 0;
    box-sizing: border-box;
    color: var(--color-secondary-text);
    cursor: pointer;
    transition: color 0.15s ease;

    &:hover {
      color: var(--color-accent, var(--bs-primary));
    }
  }

  :deep(.dp--clear-btn:focus-visible) {
    outline: 2px solid var(--color-primary-text);
    outline-offset: 1px;
  }
}

.date-picker__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
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

.date-picker--invalid :deep(.dp__input) {
  border-color: var(--bs-form-invalid-border-color, var(--bs-danger, #dc3545));
}
</style>

<style lang="scss">
.dp__menu,
.dp__menu_inner {
  max-height: none !important;
  overflow: visible !important;
}

.dp__menu {
  z-index: var(--ui-z-overlay-menu, 1070) !important;
}
</style>