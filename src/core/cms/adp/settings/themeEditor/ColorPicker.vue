<script setup>
import { ref, computed, onMounted } from 'vue'
import { Droplet } from 'lucide-vue-next'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:value'])

const colorInput = ref(null)
const hasEyeDropper = ref(false)

// Проверяем поддержку EyeDropper на клиенте
onMounted(() => {
  hasEyeDropper.value = typeof window !== 'undefined' && 'EyeDropper' in window
})

// Преобразование rgba в hex для input[type="color"]
const hexValue = computed(() => {
  const val = props.value || ''
  // Если уже hex - возвращаем как есть
  if (val.startsWith('#') && (val.length === 7 || val.length === 4)) {
    return val
  }
  // Попытка преобразовать rgba в hex
  const rgbaMatch = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
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
    // Пользователь отменил выбор
    if (e.name !== 'AbortError') {
      console.error('Ошибка EyeDropper:', e)
    }
  }
}
</script>

<template>
  <div class="color-picker-wrapper">
    <label class="form-label d-flex align-items-center justify-content-between mb-2">
      <span>
        <strong>{{ label }}</strong>
        <small v-if="description" class="text-muted d-block">{{ description }}</small>
      </span>
    </label>
    <div class="d-flex align-items-center gap-2">
      <div 
        class="color-preview" 
        :class="{ disabled: disabled }"
        :style="{ backgroundColor: value }" 
        @click="!disabled && colorInput?.click()"
      >
        <input
          ref="colorInput"
          type="color"
          :value="hexValue"
          :disabled="disabled"
          @input="updateColor($event.target.value)"
          class="color-input"
        />
      </div>
      <input
        type="text"
        :value="value"
        :disabled="disabled"
        @input="updateColor($event.target.value)"
        class="form-control flex-grow-1"
        placeholder="#000000 или rgba(...)"
      />
      <button
        v-if="hasEyeDropper"
        type="button"
        class="btn btn-outline-secondary"
        :disabled="disabled"
        @click="openEyeDropper"
        title="Пипетка"
      >
        <Droplet :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.color-picker-wrapper {
  margin-bottom: 1rem;
}

.color-preview {
  width: 50px;
  height: 38px;
  border: 2px solid var(--color-border, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;

  &:hover:not(.disabled) {
    border-color: var(--color-accent, #d0322d);
  }
  
  &.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.color-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
  margin: 0;
}

.form-control {
  font-family: monospace;
  font-size: 0.875rem;
}
</style>

