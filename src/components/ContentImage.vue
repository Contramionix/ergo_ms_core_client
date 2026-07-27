<script setup>
/**
 * Контентное изображение с поддержкой режима «без картинок».
 * Декоративные Lucide-иконки сюда не оборачивайте.
 */
defineOptions({ inheritAttrs: false })

defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  loading: { type: String, default: 'lazy' },
  decoding: { type: String, default: 'async' },
})
</script>

<template>
  <span class="ergo-content-image">
    <img
      class="ergo-content-image__img"
      :src="src"
      :alt="alt"
      :loading="loading"
      :decoding="decoding"
      v-bind="$attrs"
    >
    <span
      v-if="alt"
      class="ergo-content-image__fallback"
      aria-hidden="true"
    >{{ alt }}</span>
  </span>
</template>

<style scoped lang="scss">
.ergo-content-image {
  display: inline-block;
  max-width: 100%;
  line-height: 0;
}

.ergo-content-image__img {
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}

.ergo-content-image__fallback {
  display: none;
  line-height: 1.3;
  font-size: 0.8125rem;
  color: var(--ui-text-muted, var(--color-secondary-text));
  padding: 0.25rem 0.5rem;
  border: 1px dashed var(--ui-border, var(--color-border));
  border-radius: var(--ui-radius-sm, 0.375rem);
  background: var(--ui-surface-2, var(--color-secondary-background));
}
</style>
