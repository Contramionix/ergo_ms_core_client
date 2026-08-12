<template>
  <div class="alphabet-filter" role="group" :aria-label="resolvedAriaLabel">
    <button type="button" class="alphabet-filter__all" :class="{ 'alphabet-filter__all--active': !modelValue }" :aria-pressed="!modelValue" :disabled="disabled" @click="selectLetter('')">
      {{ t('components.alphabetFilter.all') }}
    </button>
    <button v-for="letter in resolvedLetters" :key="letter" type="button" class="alphabet-filter__letter" :class="{ 'alphabet-filter__letter--active': modelValue === letter }" :aria-pressed="modelValue === letter" :disabled="disabled" @click="selectLetter(letter)">
      {{ letter }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ALPHABET_MODES, resolveAlphabetLetters } from '@/composables/alphabetFilterLetters.js'

const { t } = useAppI18n()

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  /**
   * Набор алфавита: кириллица, латиница или оба.
   * Игнорируется, если передан непустой `letters`.
   */
  alphabet: {
    type: String,
    default: 'cyrillic',
    validator: (value) => ALPHABET_MODES.includes(value),
  },
  /** Явный список букв; перекрывает `alphabet`. */
  letters: {
    type: Array,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const resolvedLetters = computed(() => {
  if (Array.isArray(props.letters) && props.letters.length > 0) {
    return props.letters
  }
  return resolveAlphabetLetters(props.alphabet)
})

const resolvedAriaLabel = computed(() => (
  props.ariaLabel || t('components.alphabetFilter.ariaLabel')
))

function selectLetter(letter) {
  if (props.disabled) return
  // Повторный клик по активной букве = сброс («Все»).
  if (letter && letter === props.modelValue) {
    emit('update:modelValue', '')
    return
  }
  emit('update:modelValue', letter)
}
</script>

<style scoped lang="scss">
.alphabet-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.35rem 0.55rem;
  min-width: 0;
  max-width: 100%;
}

.alphabet-filter__letter,
.alphabet-filter__all {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0.1rem 0.05rem;
  margin: 0;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.25;
  color: var(--ui-accent, var(--color-accent));
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--ui-accent, var(--color-accent));
    outline-offset: 2px;
    border-radius: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.alphabet-filter__letter--active,
.alphabet-filter__all--active {
  font-weight: 700;
  text-decoration: underline;
}
</style>