<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  hoverTooltipState,
  buildHoverTooltipStyle,
  hideAllHoverTooltips,
} from '@/js/utils/hoverTooltipLayer.js'

const router = useRouter()
const popupEl = ref(null)
let removeRouteHook = null

function updatePosition() {
  const triggerRect = hoverTooltipState.triggerRect
  if (!triggerRect) {
    return
  }

  const popupWidth = popupEl.value?.getBoundingClientRect().width ?? 0
  hoverTooltipState.style = buildHoverTooltipStyle(triggerRect, popupWidth)
}

watch(
  () => [hoverTooltipState.visible, hoverTooltipState.text, hoverTooltipState.triggerRect],
  async ([visible]) => {
    if (!visible) {
      return
    }
    hoverTooltipState.style = buildHoverTooltipStyle(hoverTooltipState.triggerRect)
    await nextTick()
    updatePosition()
  },
)

removeRouteHook = router.afterEach(() => {
  hideAllHoverTooltips()
})

onBeforeUnmount(() => {
  removeRouteHook?.()
  hideAllHoverTooltips()
})
</script>

<template>
  <Teleport to="body">
    <span
      v-if="hoverTooltipState.visible && hoverTooltipState.text"
      ref="popupEl"
      class="hover-tooltip__popup"
      :class="[
        `hover-tooltip__popup--${hoverTooltipState.variant}`,
        { 'hover-tooltip__popup--wrap': hoverTooltipState.wrap },
      ]"
      :style="hoverTooltipState.style"
      role="tooltip"
    >{{ hoverTooltipState.text }}</span>
  </Teleport>
</template>

<style scoped lang="scss">
.hover-tooltip__popup {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  z-index: var(--ui-z-overlay-hover-tooltip);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &--default {
    background-color: var(--bs-tooltip-bg, rgba(0, 0, 0, 0.85));
    color: var(--bs-tooltip-color, #fff);
  }

  &--error {
    background-color: var(--bs-danger, #dc3545);
    color: #fff;
  }

  &--wrap {
    max-width: min(20rem, calc(100vw - 16px));
    white-space: normal;
    text-align: center;
  }
}
</style>
