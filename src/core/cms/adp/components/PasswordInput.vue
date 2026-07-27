<script setup>
import { computed, ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { useAppI18n } from '@/i18n/useAppI18n.js'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  id: {
    type: String,
    default: 'password',
  },
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  autocomplete: {
    type: String,
    default: 'current-password',
  },
  icon: {
    type: String,
    default: 'bi-lock',
  },
})

const emit = defineEmits(['update:modelValue'])
const { t } = useAppI18n()

const showPassword = ref(false)

const resolvedLabel = computed(() => props.label || t('components.passwordInput.label'))

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const updateValue = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="password-input" v-auto-animate v-bind="$attrs">
    <div class="password-input__field position-relative">
      <div class="form-floating">
        <input
          :type="showPassword ? 'text' : 'password'"
          :id="id"
          class="form-control pe-5"
          :class="{ 'is-invalid': error }"
          :value="modelValue"
          @input="updateValue"
          placeholder=" "
          :disabled="disabled"
          :autocomplete="autocomplete"
        />
        <label :for="id">
          <i :class="`bi ${icon} me-2`"></i>{{ resolvedLabel }}
        </label>
      </div>

      <button
        type="button"
        class="password-input__toggle"
        @click="togglePasswordVisibility"
        :disabled="disabled"
        :title="showPassword ? t('components.passwordInput.hide') : t('components.passwordInput.show')"
        :aria-label="showPassword ? t('components.passwordInput.hide') : t('components.passwordInput.show')"
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

  // Bootstrap рисует иконку ошибки справа — она пересекается с кнопкой показа пароля.
  // Текст ошибки уже выводится ниже через .invalid-feedback.
  :deep(.form-control.is-invalid) {
    background-image: none;
    padding-right: 2.75rem;
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
