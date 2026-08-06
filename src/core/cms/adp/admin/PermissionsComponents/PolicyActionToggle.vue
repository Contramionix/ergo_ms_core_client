<script setup>
import { useId } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'

defineProps({
  modelValue: { type: String, default: 'deny' },
  label: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
const { t } = useAppI18n()
const fieldId = useId()

function setAction(value) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="policy-action-toggle">
    <span v-if="label" :id="fieldId" class="form-label mb-1">{{ label }}</span>
    <div
      class="policy-action-toggle__seg"
      role="group"
      :aria-labelledby="label ? fieldId : undefined"
      :aria-label="label || t('admin.policies.action')"
    >
      <button
        type="button"
        class="policy-action-toggle__btn policy-action-toggle__btn--deny"
        :class="{ 'is-active': modelValue === 'deny' }"
        :aria-pressed="modelValue === 'deny'"
        @click="setAction('deny')"
      >
        {{ t('admin.policies.deny') }}
      </button>
      <button
        type="button"
        class="policy-action-toggle__btn policy-action-toggle__btn--allow"
        :class="{ 'is-active': modelValue === 'allow' }"
        :aria-pressed="modelValue === 'allow'"
        @click="setAction('allow')"
      >
        {{ t('admin.policies.allow') }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.policy-action-toggle {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.policy-action-toggle__seg {
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  min-height: 2.375rem;
  padding: 0.2rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-secondary-background);
  gap: 0.2rem;
}

.policy-action-toggle__btn {
  appearance: none;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-secondary-text);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;

  &:hover:not(.is-active) {
    background: var(--color-hover-background);
    color: var(--color-primary-text);
  }

  &.is-active {
    color: #fff;
  }
}

.policy-action-toggle__btn--deny.is-active {
  background: var(--bs-danger, #dc3545);
}

.policy-action-toggle__btn--allow.is-active {
  background: var(--bs-success, #198754);
}
</style>
