<script setup>
import { ref, computed, onMounted } from 'vue'
import { Droplet } from 'lucide-vue-next'

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

onMounted(() => {
  hasEyeDropper.value = typeof window !== 'undefined' && 'EyeDropper' in window
})

const hexValue = computed(() => {
  const val = props.value || ''
  if (val.startsWith('#') && (val.length === 7 || val.length === 4)) {
    return val
  }
  const rgbaMatch = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10).toString(16).padStart(2, '0')
    const g = parseInt(rgbaMatch[2], 10).toString(16).padStart(2, '0')
    const b = parseInt(rgbaMatch[3], 10).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  return '#000000'
})

const updateColor = (newColor) => {
  emit('update:value', newColor)
}

const openEyeDropper = async () => {
  if (!window.EyeDropper) {
    return
  }

  try {
    const eyeDropper = new window.EyeDropper()
    const result = await eyeDropper.open()
    updateColor(result.sRGBHex)
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
        :style="{ backgroundColor: value }"
        @click="!disabled && colorInput?.click()"
      >
        <input
          ref="colorInput"
          type="color"
          :value="hexValue"
          :disabled="disabled"
          class="color-picker__native-input"
          @input="updateColor($event.target.value)"
        />
      </div>
      <input
        type="text"
        :value="value"
        :disabled="disabled"
        class="form-control color-picker__text-input"
        placeholder="#000000 или rgba(...)"
        @input="updateColor($event.target.value)"
      />
      <button
        v-if="hasEyeDropper"
        type="button"
        class="btn-action"
        :disabled="disabled"
        title="Пипетка"
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
