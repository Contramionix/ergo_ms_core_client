<script setup>
import { ref, computed, onMounted } from 'vue'
import { Droplet } from 'lucide-vue-next'
import { logError } from '@/js/utils/logError.js'
import {
  normalizeColorToHex,
  toOpaqueHexForNativeInput,
  applyRgbKeepingAlpha,
  parseCssColor,
} from './colorFormat.js'

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:value'])

const colorInput = ref(null)
const hasEyeDropper = ref(false)
const draftText = ref(null)

onMounted(() => {
  hasEyeDropper.value = typeof window !== 'undefined' && 'EyeDropper' in window
})

const displayValue = computed(() => {
  if (draftText.value != null) {
    return draftText.value
  }
  return normalizeColorToHex(props.value)
})

const hexValue = computed(() => toOpaqueHexForNativeInput(props.value))

const updateColor = (newColor, { keepAlpha = false } = {}) => {
  draftText.value = null
  const next = keepAlpha
    ? applyRgbKeepingAlpha(newColor, props.value)
    : normalizeColorToHex(newColor)
  emit('update:value', next)
}

const onTextInput = (event) => {
  draftText.value = event.target.value
}

const onTextBlur = () => {
  if (draftText.value == null) {
    return
  }
  const raw = draftText.value.trim()
  draftText.value = null
  if (!raw) {
    return
  }
  if (parseCssColor(raw)) {
    emit('update:value', normalizeColorToHex(raw))
    return
  }
  emit('update:value', raw)
}

const openEyeDropper = async () => {
  if (!window.EyeDropper) {
    return
  }

  try {
    const eyeDropper = new window.EyeDropper()
    const result = await eyeDropper.open()
    updateColor(result.sRGBHex, { keepAlpha: true })
  } catch (e) {
    if (e.name !== 'AbortError') {
      logError('Ошибка EyeDropper:', e)
    }
  }
}
</script>

<template>
  <div class="color-picker">
    <label class="color-picker__label">
      <span class="color-picker__title">{{ label }}</span>
      <small v-if="description" class="color-picker__description">{{ description }}</small>
    </label>
    <div class="color-picker__controls">
      <div
        class="color-picker__preview"
        :class="{ 'color-picker__preview--disabled': disabled }"
        :style="{ backgroundColor: displayValue }"
        @click="!disabled && colorInput?.click()"
      >
        <input
          ref="colorInput"
          type="color"
          :value="hexValue"
          :disabled="disabled"
          class="color-picker__native-input"
          @input="updateColor($event.target.value, { keepAlpha: true })"
        />
      </div>
      <input
        type="text"
        :value="displayValue"
        :disabled="disabled"
        class="form-control color-picker__text-input"
        placeholder="#rrggbb или #rrggbbaa"
        spellcheck="false"
        @input="onTextInput"
        @blur="onTextBlur"
        @keydown.enter.prevent="onTextBlur"
      />
      <button
        v-if="hasEyeDropper"
        type="button"
        class="btn-action"
        :disabled="disabled"
        title="Пипетка"
        aria-label="Пипетка"
        @click="openEyeDropper"
      >
        <Droplet :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.color-picker {
  margin-bottom: 1rem;
}

.color-picker__label {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin-bottom: 0.5rem;
}

.color-picker__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.color-picker__description {
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--ui-text) 80%, var(--ui-text-muted));
}

.color-picker__controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-picker__preview {
  width: 2.375rem;
  height: 2.375rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;

  &:hover:not(.color-picker__preview--disabled) {
    border-color: var(--color-primary-text);
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
}

.color-picker__native-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
  margin: 0;
}

.color-picker__text-input {
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid var(--color-border);
  background: var(--color-secondary-background);
  color: var(--color-primary-text);
  border-radius: 0.5rem;
  font-family: var(--font-family-mono);
  font-size: 0.8125rem;

  &:focus {
    border-color: var(--color-primary-text);
    box-shadow: none;
  }

  &::placeholder {
    color: var(--color-secondary-text);
  }

  &:disabled {
    opacity: 0.65;
  }
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  color: var(--ui-text);

  &:hover:not(:disabled) {
    background-color: var(--ui-hover);
    color: var(--ui-text);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
</style>
