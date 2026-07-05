<script setup>
import { computed } from 'vue'

import HoverTooltip from '@/components/HoverTooltip.vue'
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
  <HoverTooltip
    v-if="visible"
    :text="showTooltip ? tooltipText : ''"
    class="presence-indicator"
    :class="isOnline ? 'presence-indicator--online' : 'presence-indicator--offline'"
    :style="dotStyle"
    :aria-label="tooltipText"
    role="status"
  />
</template>

<style scoped lang="scss">
.presence-indicator {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid var(--color-primary-background, #fff);
  box-sizing: content-box;
  pointer-events: none;
  flex-shrink: 0;
  max-width: none;
  max-height: none;

  &--online {
    background-color: var(--bs-success, #198754);
  }

  &--offline {
    background-color: var(--color-secondary-text, #6c757d);
  }

  &.hover-tooltip--enabled {
    pointer-events: auto;
  }
}
</style>
