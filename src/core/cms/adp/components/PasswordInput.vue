<script setup>
import { ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Пароль'
  },
  label: {
    type: String,
    default: 'Пароль'
  },
  error: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  },
  autocomplete: {
    type: String,
    default: 'current-password'
  },
  icon: {
    type: String,
    default: 'bi-lock'
  }
})

const emit = defineEmits(['update:modelValue'])

const showPassword = ref(false)

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const updateValue = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="password-input" v-auto-animate>
    <div class="password-input__field position-relative">
      <div class="form-floating">
        <input
          :type="showPassword ? 'text' : 'password'"
          :id="$attrs.id || 'password'"
          class="form-control pe-5"
          :class="{ 'is-invalid': error }"
          :value="modelValue"
          @input="updateValue"
          placeholder=" "
          :disabled="disabled"
          :autocomplete="autocomplete"
          :aria-label="label"
        />
        <label :for="$attrs.id || 'password'">
          <i :class="`bi ${icon} me-2`"></i>{{ label }}
        </label>
      </div>

      <button
        type="button"
        class="password-input__toggle"
        @click="togglePasswordVisibility"
        :disabled="disabled"
        :title="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
        :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
      >
        <EyeOff v-if="showPassword" :size="18" aria-hidden="true" />
        <Eye v-else :size="18" aria-hidden="true" />
      </button>
    </div>

    <div v-if="error" class="invalid-feedback d-block">
      {{ error }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.password-input {
  :deep(.form-floating > label) {
    max-width: calc(100% - 2.75rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.password-input__toggle {
  position: absolute;
  top: 50%;
  right: 0.625rem;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 0.375rem;
  background: none;
  color: var(--ui-text-muted);
  transform: translateY(-50%);
  line-height: 1;

  &:hover:not(:disabled) {
    color: var(--ui-text);
    background: var(--ui-hover);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
    outline-offset: 2px;
    box-shadow: none;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.form-control:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--color-accent) 25%, transparent);
}
</style>
