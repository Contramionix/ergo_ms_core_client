<template>
  <div class="form-card">
    <div class="form-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="form-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped lang="scss">
.form-card {
  width: 100%;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;
}

.form-card__body {
  min-width: 0;
}

.form-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem 1rem;
  background: var(--color-primary-background);
  border-top: 1px solid var(--color-border);
}
</style>
