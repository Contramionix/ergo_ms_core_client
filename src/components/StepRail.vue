<template>
  <component :is="interactive ? 'nav' : 'div'" class="step-rail" :role="interactive ? undefined : 'group'" :aria-label="resolvedLabel">
    <ol class="step-rail__list">
      <li v-for="(step, index) in steps" :key="step.id" class="step-rail__item" :class="{ 'step-rail__item--link-done': isLinkDone(step, index) }">
        <button v-if="interactive" type="button" class="step-rail__step" :class="stepClass(step)" :disabled="!!step.disabled" :aria-current="step.state === 'current' ? 'step' : undefined" @click="onSelect(step)">
          <span class="step-rail__marker">
            <Check v-if="step.state === 'passed'" :size="18" aria-hidden="true" />
            <span v-else-if="step.marker" class="step-rail__number">{{ step.marker }}</span>
          </span>
          <span class="step-rail__label">{{ step.label }}</span>
          <span v-if="step.caption" class="step-rail__caption">{{ step.caption }}</span>
        </button>
        <div v-else class="step-rail__step" :class="stepClass(step)" :aria-current="step.state === 'current' ? 'step' : undefined">
          <span class="step-rail__marker">
            <Check v-if="step.state === 'passed'" :size="18" aria-hidden="true" />
            <span v-else-if="step.marker" class="step-rail__number">{{ step.marker }}</span>
          </span>
          <span class="step-rail__label">{{ step.label }}</span>
          <span v-if="step.caption" class="step-rail__caption">{{ step.caption }}</span>
        </div>
      </li>
    </ol>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { Check } from '@lucide/vue'

const props = defineProps({
  steps: {
    type: Array,
    required: true,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  interactive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])

const resolvedLabel = computed(() => props.ariaLabel || undefined)

function isLinkDone(step, index) {
  if (index >= props.steps.length - 1) return false
  if (step.link === 'done') return true
  if (step.link === 'idle') return false
  return step.state === 'passed'
}

function stepClass(step) {
  return {
    'step-rail__step--active': step.state === 'current',
    'step-rail__step--completed': step.state === 'passed',
    'step-rail__step--disabled': props.interactive && !!step.disabled,
  }
}

function onSelect(step) {
  if (step.disabled) return
  emit('select', step.id)
}
</script>

<style scoped lang="scss">
@use '@/scss/ui/mixins' as *;

.step-rail {
  --step-rail-accent: var(--bs-primary, var(--color-accent));
  --step-rail-muted: var(--color-secondary-text, var(--ui-text-muted));
  --step-rail-track: var(--color-border, var(--ui-border));
  --step-rail-surface: var(--color-primary-background, var(--ui-surface));
  --step-rail-text: var(--color-primary-text, var(--ui-text));
  --step-rail-marker-size: 2.25rem;
  --step-rail-marker-font-size: 0.875rem;

  width: 100%;
}

.step-rail__list {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.step-rail__item {
  flex: 1 1 0;
  min-width: 6.5rem;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    top: calc(var(--step-rail-marker-size) / 2);
    left: calc(50% + var(--step-rail-marker-size) / 2);
    right: calc(-50% + var(--step-rail-marker-size) / 2);
    height: 2px;
    background: var(--step-rail-track);
    transform: translateY(-50%);
    z-index: 0;
    pointer-events: none;
  }

  &--link-done:not(:last-child)::after {
    background: var(--step-rail-accent);
  }
}

.step-rail__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  position: relative;
  z-index: 1;
  color: var(--step-rail-text);
  cursor: default;
  @include ui-a11y-focus;

  &--disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

button.step-rail__step {
  cursor: pointer;
}

.step-rail__marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--step-rail-marker-size);
  height: var(--step-rail-marker-size);
  border-radius: 50%;
  border: 2px solid var(--step-rail-track);
  background: var(--step-rail-surface);
  color: var(--step-rail-muted);
  font-size: var(--step-rail-marker-font-size);
  font-weight: var(--u-font-weight-emphasis, 600);
  flex-shrink: 0;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.step-rail__number {
  line-height: 1;
}

.step-rail__step--active .step-rail__marker {
  border-color: var(--step-rail-accent);
  color: var(--step-rail-accent);
  background: var(--step-rail-surface);
}

.step-rail__step--completed .step-rail__marker {
  border-color: var(--step-rail-accent);
  background: var(--step-rail-accent);
  color: var(--step-rail-surface);
}

.step-rail__step--active .step-rail__label {
  color: var(--step-rail-text);
  font-weight: var(--u-font-weight-emphasis, 600);
}

.step-rail__step--completed .step-rail__label {
  color: var(--step-rail-text);
}

.step-rail__step--disabled .step-rail__label {
  color: var(--step-rail-muted);
}

.step-rail__label {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.3;
  max-width: 9rem;
  width: 100%;
  color: var(--step-rail-muted);
  transition: color 0.2s ease;
}

.step-rail__caption {
  margin-top: -0.25rem;
  max-width: 9rem;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--step-rail-muted);
}

@media (max-width: 768px) {
  .step-rail__list {
    overflow-x: auto;
    justify-content: flex-start;
    padding-bottom: 0.5rem;
    scrollbar-width: thin;
  }

  .step-rail__item {
    flex: 0 0 auto;
    min-width: 7rem;
  }
}
</style>