<template>
  <div v-if="!dataset" class="fields-placeholder">
    <div class="alert alert-info info-box">
      <CircleAlert :size="40" class="me-1" />
      Прежде чем увидеть содержимое, добавьте датасет
    </div>
  </div>
  <div v-else style="height: 100%; display: flex; justify-content: center; align-items: center; color: var(--color-secondary-text);">
    <i>Параметры не найдены</i>
  </div>
</template>

<script setup>
import { CircleAlert } from 'lucide-vue-next'
const props = defineProps({ dataset: Object })
</script>

<style scoped lang="scss">
.fields-placeholder {
  height: 100%;
}

.info-box {
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  text-align: center;
  gap: 10px;
  padding: 12px;
  font-size: 0.95rem;
  line-height: 1.3;
}

:deep(.info-box svg) {
  display: block;
}

@media (max-width: 575.98px) {
  .info-box {
    padding: 10px;
    gap: 8px;
    font-size: 0.9rem;
    line-height: 1.25;
  }

  :deep(.info-box svg) {
    width: 28px;
    height: 28px;
  }
}

@media (min-width: 576px) and (max-width: 767.98px) {
  .info-box {
    gap: 10px;
    font-size: 0.95rem;
    line-height: 1.3;
  }

  :deep(.info-box svg) {
    width: 32px;
    height: 32px;
  }
}

@media (min-width: 768px) and (max-width: 991.98px) {
  .info-box {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    font-size: 1rem;
    line-height: 1.35;
  }

  :deep(.info-box svg) {
    width: 36px;
    height: 36px;
  }
}

@media (min-width: 992px) {
  .info-box {
    flex-direction: column;
    text-align: center;
    gap: 6px;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  :deep(.info-box svg) {
    width: 40px;
    height: 40px;
  }
}
</style>