<script setup>
import { Trash2, Upload } from '@lucide/vue'

defineProps({
  editable: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  primaryLabel: { type: String, default: '' },
  removeLabel: { type: String, default: '' },
})

const emit = defineEmits(['primary', 'remove'])

function act(name, event) {
  event.currentTarget?.blur()
  emit(name)
}
</script>

<template>
  <div class="image-hover">
    <div class="image-hover__media" :class="{ 'image-hover__media--busy': editable && busy }">
      <slot />
      <div v-if="editable && busy" class="image-hover__busy">
        <slot name="busy" />
      </div>
      <div v-else-if="editable" class="image-hover__layer">
        <div class="image-hover__dimmer" aria-hidden="true" />
        <div class="image-hover__actions">
          <button type="button" class="image-hover__action" :disabled="disabled" @click.stop="act('primary', $event)">
            <Upload :size="16" aria-hidden="true" />
            <span>{{ primaryLabel }}</span>
          </button>
          <button v-if="removeLabel" type="button" class="image-hover__action image-hover__action--danger" :disabled="disabled" @click.stop="act('remove', $event)">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ removeLabel }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="editable" class="image-hover__fallback">
      <button type="button" class="image-hover__fallback-action" :disabled="disabled" @click="emit('primary')">
        <Upload :size="16" aria-hidden="true" />
        <span>{{ primaryLabel }}</span>
      </button>
      <button v-if="removeLabel" type="button" class="image-hover__fallback-action image-hover__fallback-action--danger" :disabled="disabled" @click="emit('remove')">
        <Trash2 :size="16" aria-hidden="true" />
        <span>{{ removeLabel }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/scss/ui/mixins' as *;

.image-hover {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.image-hover__media {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: inherit;
  line-height: 0;

  &--busy {
    pointer-events: none;
  }
}

.image-hover__busy,
.image-hover__layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: inherit;
}

.image-hover__busy {
  z-index: 2;
  background: color-mix(in srgb, var(--color-primary-background) 55%, transparent);
}

.image-hover__layer {
  @include ui-reduced-motion;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
}

.image-hover__media:hover .image-hover__layer,
.image-hover__media:focus-within .image-hover__layer {
  opacity: 1;
  pointer-events: auto;
}

.image-hover__dimmer {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.52);
}

.image-hover__actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  width: 100%;
  max-width: 11.5rem;
  padding: 0 0.65rem;
}

.image-hover__action {
  @include ui-a11y-focus;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.4rem 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.375rem;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.55);
    background: rgba(0, 0, 0, 0.55);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.image-hover__action--danger {
  border-color: color-mix(in srgb, #f8b4b4 55%, transparent);
  color: #ffe8e8;

  &:hover:not(:disabled) {
    border-color: rgba(255, 200, 200, 0.65);
    background: rgba(180, 40, 40, 0.55);
  }
}

.image-hover__fallback {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.image-hover__fallback-action {
  @include ui-a11y-focus;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--color-accent);
    background: var(--color-hover-background);
    color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.image-hover__fallback-action--danger {
  border-color: color-mix(in srgb, var(--bs-danger, #dc3545) 45%, var(--color-border));
  color: var(--bs-danger, #dc3545);

  &:hover:not(:disabled) {
    border-color: var(--bs-danger, #dc3545);
    background: color-mix(in srgb, var(--bs-danger, #dc3545) 12%, transparent);
  }
}

@media (hover: none) {
  .image-hover__layer {
    display: none;
  }

  .image-hover__fallback {
    display: flex;
  }
}
</style>