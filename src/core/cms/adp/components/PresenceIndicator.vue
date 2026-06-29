<script setup>
import { computed } from 'vue'

import { formatPresenceTooltip } from '@/core/cms/adp/js/presence/formatPresenceTooltip.js'

const props = defineProps({
  isOnline: { type: Boolean, default: false },
  size: { type: Number, default: 40 },
  visible: { type: Boolean, default: false },
  showTooltip: { type: Boolean, default: false },
  lastSeen: { type: [String, null], default: null },
})

const EDGE_ANGLE = Math.PI / 4

const dotSize = computed(() => Math.max(8, Math.round(props.size * 0.28)))

const dotStyle = computed(() => {
  const avatarRadius = props.size / 2
  const centerX = props.size / 2 + avatarRadius * Math.cos(EDGE_ANGLE)
  const centerY = props.size / 2 + avatarRadius * Math.sin(EDGE_ANGLE)

  return {
    width: `${dotSize.value}px`,
    height: `${dotSize.value}px`,
    left: `${centerX}px`,
    top: `${centerY}px`,
  }
})

const tooltipText = computed(() => formatPresenceTooltip(props.isOnline, props.lastSeen))
</script>

<template>
  <span
    v-if="visible"
    class="presence-indicator"
    :class="[
      isOnline ? 'presence-indicator--online' : 'presence-indicator--offline',
      { 'presence-indicator--tooltip': showTooltip },
    ]"
    :style="dotStyle"
    :aria-label="tooltipText"
    role="status"
  >
    <span v-if="showTooltip" class="presence-indicator__tooltip">{{ tooltipText }}</span>
  </span>
</template>

<style scoped lang="scss">
.presence-indicator {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid var(--color-primary-background, #fff);
  box-sizing: content-box;
  pointer-events: none;

  &--online {
    background-color: var(--bs-success, #198754);
  }

  &--offline {
    background-color: var(--color-secondary-text, #6c757d);
  }

  &--tooltip {
    pointer-events: auto;
    cursor: default;
  }

  &__tooltip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background-color: var(--bs-tooltip-bg, rgba(0, 0, 0, 0.85));
    color: var(--bs-tooltip-color, #fff);
    font-size: 0.75rem;
    line-height: 1.2;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &--tooltip:hover &__tooltip {
    opacity: 1;
  }
}
</style>
