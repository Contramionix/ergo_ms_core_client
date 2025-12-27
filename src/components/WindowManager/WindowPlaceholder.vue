<script setup>
import { Package, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    default: 'Модуль'
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="window-placeholder">
    <div class="window-placeholder__content">
      <div class="window-placeholder__icon">
        <Loader2 v-if="isLoading" :size="48" class="window-placeholder__spinner" />
        <Package v-else :size="48" />
      </div>
      <h3 class="window-placeholder__title">{{ title }}</h3>
      <p v-if="isLoading" class="window-placeholder__text">
        Загрузка модуля...
      </p>
      <p v-else class="window-placeholder__text">
        Модуль загружается или недоступен
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.window-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bs-body-bg, #f8f9fa);
  padding: 2rem;
}

.window-placeholder__content {
  text-align: center;
  max-width: 400px;
}

.window-placeholder__icon {
  margin-bottom: 1.5rem;
  color: var(--bs-secondary, #6c757d);
  display: flex;
  align-items: center;
  justify-content: center;
}

.window-placeholder__spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.window-placeholder__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--bs-body-color, #212529);
}

.window-placeholder__text {
  color: var(--bs-secondary, #6c757d);
  margin: 0;
  font-size: 0.9rem;
}
</style>

