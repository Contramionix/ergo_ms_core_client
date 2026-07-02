<script setup>
import { ref, onBeforeUnmount } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'error'].includes(value),
  },
})

const triggerEl = ref(null)
const visible = ref(false)
const popupStyle = ref({})
let hideTimeout = null

function updatePosition() {
  const el = triggerEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  popupStyle.value = {
    position: 'fixed',
    top: `${rect.top - 6}px`,
    left: `${rect.left + rect.width / 2}px`,
    transform: 'translate(-50%, -100%)',
  }
}

function onEnter() {
  if (!props.text) return
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  updatePosition()
  visible.value = true
}

function onLeave() {
  hideTimeout = setTimeout(() => {
    visible.value = false
  }, 100)
}

onBeforeUnmount(() => {
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>

<template>
  <span
    ref="triggerEl"
    class="hover-tooltip"
    :class="{ 'hover-tooltip--enabled': Boolean(text) }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
    <Teleport to="body">
      <span
        v-if="visible && text"
        class="hover-tooltip__popup"
        :class="`hover-tooltip__popup--${variant}`"
        :style="popupStyle"
        role="tooltip"
      >{{ text }}</span>
    </Teleport>
  </span>
</template>

<style scoped lang="scss">
.hover-tooltip {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;

  &--enabled {
    cursor: default;
  }
}

.hover-tooltip__popup {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &--default {
    background-color: var(--bs-tooltip-bg, rgba(0, 0, 0, 0.85));
    color: var(--bs-tooltip-color, #fff);
  }

  &--error {
    background-color: var(--bs-danger, #dc3545);
    color: #fff;
  }
}
</style>
