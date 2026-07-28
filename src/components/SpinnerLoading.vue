<script setup>
import { computed } from 'vue'
import { useUiModes } from '@/composables/useUiModes.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const BOOTSTRAP_VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark']

const { t } = useAppI18n()

const props = defineProps({
  loadingText: {
    type: String,
    default: '',
    required: false
  },
  color: {
    type: String,
    default: 'primary'
  },
  variant: {
    type: String,
    default: 'default' // default | button
  }
})

const { reducedMotionActive } = useUiModes()

const showRing = computed(() => !reducedMotionActive.value)

const displayText = computed(() => {
  if (props.loadingText) return props.loadingText
  if (reducedMotionActive.value) return t('components.spinner.loading')
  return ''
})

const ringClass = computed(() => {
  const c = props.color?.toLowerCase?.() ?? 'primary'
  // primary — через --color-accent (не .text-primary / --bs-primary-rgb Bootstrap)
  if (c === 'primary') {
    return ''
  }
  if (BOOTSTRAP_VARIANTS.includes(c)) {
    return `text-${c}`
  }
  return ''
})

const ringStyle = computed(() => {
  const c = props.color?.trim?.() ?? 'primary'
  const lower = c.toLowerCase()
  if (lower === 'primary') {
    return {}
  }
  if (BOOTSTRAP_VARIANTS.includes(lower)) {
    return {}
  }
  return { '--spinner-color': c }
})
</script>

<template>
  <div
    class="spinner-loading"
    :class="[`spinner-loading--variant-${props.variant}`]"
  >
    <div
      v-if="showRing"
      class="spinner-loading__ring"
      :class="ringClass"
      :style="ringStyle"
      role="status"
      :aria-label="t('components.spinner.loading')"
    />
    <p
      v-if="displayText"
      class="spinner-loading__text"
      :class="{ 'spinner-loading__text--solo': !showRing }"
      role="status"
      aria-live="polite"
    >
      {{ displayText }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.spinner-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.spinner-loading--variant-button {
  gap: 0;
}

.spinner-loading--variant-button .spinner-loading__ring {
  width: 40px;
  height: 40px;
}

.spinner-loading__ring {
  width: 48px;
  height: 48px;
  border: 3px solid transparent;
  border-top-color: var(
    --spinner-color,
    var(--color-accent, var(--bs-primary, #d0322d))
  );
  border-radius: 50%;
  animation: spinner-loading-spin 0.9s linear infinite;

  &.text-secondary,
  &.text-success,
  &.text-danger,
  &.text-warning,
  &.text-info,
  &.text-light,
  &.text-dark {
    border-top-color: var(--spinner-color, currentColor);
  }
}

.spinner-loading__text {
  font-size: 14px;
  color: var(--bs-body-color);
  margin: 0;
  text-align: center;
}

.spinner-loading__text--solo {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ui-text-muted, var(--color-secondary-text, var(--bs-secondary-color)));
}

@keyframes spinner-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
