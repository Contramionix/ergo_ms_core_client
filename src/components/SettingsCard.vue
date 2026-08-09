<template>
  <div class="settings-card" :class="{ 'settings-card--overflow-visible': overflowVisible }">
    <div class="settings-card__body">
      <slot />
    </div>
    <Transition name="settings-card-footer">
      <div v-if="showFooter && $slots.footer" class="settings-card__footer">
        <slot name="footer" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
defineProps({
  /** Для вложенных dropdown / палитр, которым нужен выход за границы карточки */
  overflowVisible: {
    type: Boolean,
    default: false,
  },
  /** Показать слот #footer (можно анимировать появлением/скрытием) */
  showFooter: {
    type: Boolean,
    default: true,
  },
})
</script>

<style scoped lang="scss">
.settings-card {
  width: 100%;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  overflow: hidden;
}

.settings-card--overflow-visible {
  overflow: visible;
}

.settings-card + .settings-card {
  margin-top: 0.75rem;
}

.settings-card__body {
  min-width: 0;
}

.settings-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem 1rem;
  background: var(--color-primary-background);
  border-top: 1px solid var(--color-border);
  overflow: hidden;
}

.settings-card-footer-enter-active,
.settings-card-footer-leave-active {
  transition:
    max-height 0.28s ease,
    opacity 0.22s ease,
    padding 0.28s ease,
    border-color 0.22s ease;
  max-height: 5rem;
}

.settings-card-footer-enter-from,
.settings-card-footer-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-top-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .settings-card-footer-enter-active,
  .settings-card-footer-leave-active {
    transition: none;
  }
}
</style>