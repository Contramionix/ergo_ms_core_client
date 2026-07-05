<script setup>
import { ref, onBeforeUnmount, onMounted, watch, nextTick } from 'vue'
import {
  hideHoverTooltipForOwner,
  hideAllHoverTooltips,
  showHoverTooltip,
} from '@/js/utils/hoverTooltipLayer.js'

const props = defineProps({
  text: { type: String, default: '' },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'error'].includes(value),
  },
  wrap: { type: Boolean, default: false },
})

const wrapperEl = ref(null)
let triggerTarget = null

function resolveTriggerTarget() {
  const wrapper = wrapperEl.value
  if (!wrapper) {
    return null
  }
  const child = wrapper.firstElementChild
  return child instanceof Element ? child : wrapper
}

function hideNow() {
  hideHoverTooltipForOwner(hideNow)
}

function onEnter() {
  if (!props.text) {
    hideAllHoverTooltips()
    return
  }

  const el = triggerTarget || resolveTriggerTarget()
  if (!el) return

  showHoverTooltip({
    ownerHide: hideNow,
    text: props.text,
    variant: props.variant,
    wrap: props.wrap,
    triggerRect: el.getBoundingClientRect(),
  })
}

function onLeave() {
  hideHoverTooltipForOwner(hideNow)
}

function bindEvents() {
  unbindEvents()
  triggerTarget = resolveTriggerTarget()
  if (!triggerTarget) {
    return
  }
  triggerTarget.addEventListener('mouseenter', onEnter)
  triggerTarget.addEventListener('mouseleave', onLeave)
}

function unbindEvents() {
  if (!triggerTarget) {
    return
  }
  triggerTarget.removeEventListener('mouseenter', onEnter)
  triggerTarget.removeEventListener('mouseleave', onLeave)
  triggerTarget = null
}

onMounted(() => {
  nextTick(bindEvents)
})

watch(
  () => props.text,
  () => nextTick(bindEvents),
)

onBeforeUnmount(() => {
  unbindEvents()
  hideHoverTooltipForOwner(hideNow)
})
</script>

<template>
  <span
    ref="wrapperEl"
    class="hover-tooltip"
    :class="{ 'hover-tooltip--enabled': Boolean(text) }"
  >
    <slot />
  </span>
</template>

<style scoped lang="scss">
.hover-tooltip {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
</style>
