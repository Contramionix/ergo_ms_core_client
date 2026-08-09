<script setup>
import { ref, onBeforeUnmount, onMounted, watch, nextTick } from 'vue'
import {
  hideHoverTooltipForOwner,
  hideAllHoverTooltips,
  showHoverTooltip,
} from '@/js/utils/hoverTooltipLayer.js'

const LONG_PRESS_MS = 400
const MOVE_CANCEL_PX = 10
/** После клика игнорировать синтетический mouseenter/focus, пока курсор реально не сдвинется. */
const POINTER_RESUME_PX = 4

const props = defineProps({
  text: { type: String, default: '' },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'error'].includes(value),
  },
  wrap: { type: Boolean, default: false },
  onlyWhenTruncated: { type: Boolean, default: false },
})

const wrapperEl = ref(null)
let triggerTarget = null
let longPressTimer = null
let touchStartX = 0
let touchStartY = 0
let touchListenersBound = false
let documentDismissBound = false
let suppressNextClick = false
/**
 * После pointerdown на триггере: не показывать тултип на focus restore / mouseenter
 * после закрытия модалки (backdrop даёт ложный leave→enter без движения мыши).
 */
let blockUntilPointerMove = false
let blockPointerX = 0
let blockPointerY = 0
let pointerResumeBound = false

function canHoverFine() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

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
  unbindDocumentDismiss()
}

function clearLongPressTimer() {
  if (longPressTimer != null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function showNow() {
  if (!props.text) {
    hideAllHoverTooltips()
    return
  }

  const el = triggerTarget || resolveTriggerTarget()
  if (!el) return

  if (props.onlyWhenTruncated && el.scrollWidth <= el.clientWidth + 1) {
    hideAllHoverTooltips()
    return
  }

  showHoverTooltip({
    ownerHide: hideNow,
    text: props.text,
    variant: props.variant,
    wrap: props.wrap,
    triggerRect: el.getBoundingClientRect(),
  })

  if (!canHoverFine()) {
    bindDocumentDismiss()
  }
}

function isShowBlocked() {
  return blockUntilPointerMove
}

function unbindPointerResume() {
  if (!pointerResumeBound || typeof document === 'undefined') {
    return
  }
  pointerResumeBound = false
  document.removeEventListener('pointermove', onDocumentPointerMove, true)
}

function clearPointerBlock() {
  blockUntilPointerMove = false
  unbindPointerResume()
}

function bindPointerResume() {
  if (pointerResumeBound || typeof document === 'undefined') {
    return
  }
  pointerResumeBound = true
  document.addEventListener('pointermove', onDocumentPointerMove, true)
}

function onDocumentPointerMove(event) {
  if (!blockUntilPointerMove) {
    unbindPointerResume()
    return
  }
  const dx = Math.abs(event.clientX - blockPointerX)
  const dy = Math.abs(event.clientY - blockPointerY)
  if (dx > POINTER_RESUME_PX || dy > POINTER_RESUME_PX) {
    clearPointerBlock()
  }
}

function onEnter() {
  if (isShowBlocked()) {
    return
  }
  showNow()
}

function onLeave() {
  hideNow()
}

function onFocus() {
  if (isShowBlocked()) {
    return
  }
  showNow()
}

function onBlur() {
  hideNow()
}

function onPointerDown(event) {
  if (!canHoverFine()) {
    return
  }
  blockUntilPointerMove = true
  blockPointerX = event.clientX
  blockPointerY = event.clientY
  bindPointerResume()
  hideNow()
}

function onTouchStart(event) {
  if (!props.text || canHoverFine()) {
    return
  }
  const touch = event.changedTouches?.[0]
  if (!touch) {
    return
  }
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  clearLongPressTimer()
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    suppressNextClick = true
    showNow()
  }, LONG_PRESS_MS)
}

function onClickCapture(event) {
  if (!suppressNextClick) {
    return
  }
  suppressNextClick = false
  event.preventDefault()
  event.stopPropagation()
}

function onTouchMove(event) {
  if (longPressTimer == null) {
    return
  }
  const touch = event.changedTouches?.[0]
  if (!touch) {
    return
  }
  const dx = Math.abs(touch.clientX - touchStartX)
  const dy = Math.abs(touch.clientY - touchStartY)
  if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
    clearLongPressTimer()
  }
}

function onTouchEnd() {
  clearLongPressTimer()
}

function onDocumentPointerDown(event) {
  const el = triggerTarget || resolveTriggerTarget()
  if (!el) {
    hideNow()
    return
  }
  const target = event.target
  if (target instanceof Node && el.contains(target)) {
    return
  }
  hideNow()
}

function onDocumentScroll() {
  hideNow()
}

function bindDocumentDismiss() {
  if (documentDismissBound || typeof document === 'undefined') {
    return
  }
  documentDismissBound = true
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('scroll', onDocumentScroll, true)
}

function unbindDocumentDismiss() {
  if (!documentDismissBound || typeof document === 'undefined') {
    return
  }
  documentDismissBound = false
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('scroll', onDocumentScroll, true)
}

function bindEvents() {
  unbindEvents()
  triggerTarget = resolveTriggerTarget()
  if (!triggerTarget) {
    return
  }

  if (canHoverFine()) {
    triggerTarget.addEventListener('mouseenter', onEnter)
    triggerTarget.addEventListener('mouseleave', onLeave)
    triggerTarget.addEventListener('pointerdown', onPointerDown)
  } else {
    touchListenersBound = true
    triggerTarget.addEventListener('touchstart', onTouchStart, { passive: true })
    triggerTarget.addEventListener('touchmove', onTouchMove, { passive: true })
    triggerTarget.addEventListener('touchend', onTouchEnd, { passive: true })
    triggerTarget.addEventListener('touchcancel', onTouchEnd, { passive: true })
    triggerTarget.addEventListener('click', onClickCapture, true)
  }

  triggerTarget.addEventListener('focus', onFocus)
  triggerTarget.addEventListener('blur', onBlur)
}

function unbindEvents() {
  clearLongPressTimer()
  unbindDocumentDismiss()
  clearPointerBlock()
  suppressNextClick = false
  if (!triggerTarget) {
    return
  }
  triggerTarget.removeEventListener('mouseenter', onEnter)
  triggerTarget.removeEventListener('mouseleave', onLeave)
  triggerTarget.removeEventListener('pointerdown', onPointerDown)
  if (touchListenersBound) {
    triggerTarget.removeEventListener('touchstart', onTouchStart)
    triggerTarget.removeEventListener('touchmove', onTouchMove)
    triggerTarget.removeEventListener('touchend', onTouchEnd)
    triggerTarget.removeEventListener('touchcancel', onTouchEnd)
    triggerTarget.removeEventListener('click', onClickCapture, true)
    touchListenersBound = false
  }
  triggerTarget.removeEventListener('focus', onFocus)
  triggerTarget.removeEventListener('blur', onBlur)
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
