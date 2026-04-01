<script setup>
import { computed } from 'vue'

const BOOTSTRAP_VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark']

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

const ringClass = computed(() => {
  const c = props.color?.toLowerCase?.() ?? 'primary'
  if (BOOTSTRAP_VARIANTS.includes(c)) {
    return `text-${c}`
  }
  return ''
})

const ringStyle = computed(() => {
  const c = props.color?.trim?.() ?? 'primary'
  if (BOOTSTRAP_VARIANTS.includes(c.toLowerCase())) {
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
      class="spinner-loading__ring"
      :class="ringClass"
      :style="ringStyle"
      role="status"
      aria-label="Загрузка"
    />
    <p v-if="loadingText" class="spinner-loading__text">
      {{ loadingText }}
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
  border-top-color: var(--spinner-color, currentColor);
  border-radius: 50%;
  animation: spinner-loading-spin 0.9s linear infinite;
}

.spinner-loading__text {
  font-size: 14px;
  color: var(--bs-body-color);
  margin: 0;
  text-align: center;
}

@keyframes spinner-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>