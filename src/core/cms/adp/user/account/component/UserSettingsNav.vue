<script setup>
defineProps({
  sections: { type: Array, required: true },
  activeTabId: { type: String, required: true },
})

const emit = defineEmits(['select'])
</script>

<template>
  <nav class="user-settings-modal__nav" aria-label="Разделы настроек">
    <div v-for="(section, sectionIndex) in sections" :key="section.title ?? sectionIndex" class="user-settings-modal__nav-section">
      <h3 class="user-settings-modal__nav-section-title">{{ section.title }}</h3>
      <ul class="user-settings-modal__nav-list list-unstyled mb-0">
        <li v-for="tab in section.items" :key="tab.id">
          <button type="button" class="user-settings-modal__nav-item" :class="{ 'user-settings-modal__nav-item--active': activeTabId === tab.id }" @click="emit('select', tab.id)">
            <span class="user-settings-modal__nav-icon" aria-hidden="true">
              <component :is="tab.icon" :size="18" />
            </span>
            <span>{{ tab.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.user-settings-modal__nav {
  flex: 0 0 260px;
  max-width: 280px;
  border-right: 1px solid var(--color-secondary-background);
  background-color: var(--color-secondary-background);
  padding: 0.75rem 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-hover-background) transparent;
}

.user-settings-modal__nav-section {
  &:not(:first-child) {
    margin-top: 1rem;
    padding-top: 1rem;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0.5rem;
      right: 0.5rem;
      height: 1px;
      background-color: var(--color-hover-background);
    }
  }
}

.user-settings-modal__nav-section-title {
  margin: 0 0 0.375rem;
  padding: 0 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-secondary-text, rgba(128, 128, 128, 0.95));
}

.user-settings-modal__nav-list {
  padding: 0 0.5rem;
}

.user-settings-modal__nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.125rem;
  border: none;
  border-radius: $radius-usual;
  background: transparent;
  color: var(--color-primary-text);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--color-hover-background);
  }

  &--active {
    background-color: var(--color-hover-background);
    font-weight: 600;
  }
}

.user-settings-modal__nav-icon {
  display: inline-flex;
  flex-shrink: 0;
  opacity: 0.9;
}
</style>