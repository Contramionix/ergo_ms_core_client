import { reactive } from 'vue'

export const VIEWPORT_PADDING = 8

export const hoverTooltipState = reactive({
  visible: false,
  text: '',
  variant: 'default',
  wrap: false,
  style: {},
  triggerRect: null,
})

let activeOwnerHide = null
let hideTimeout = null

export function hideAllHoverTooltips() {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  hoverTooltipState.visible = false
  hoverTooltipState.text = ''
  hoverTooltipState.wrap = false
  hoverTooltipState.triggerRect = null
  hoverTooltipState.style = {}
  activeOwnerHide = null
}

export function hideHoverTooltip(ownerHide) {
  if (ownerHide && activeOwnerHide !== ownerHide) {
    return
  }
  hideAllHoverTooltips()
}

export function hideHoverTooltipForOwner(ownerHide) {
  if (activeOwnerHide !== ownerHide) {
    return
  }
  hideAllHoverTooltips()
}

export function showHoverTooltip({ ownerHide, text, variant, wrap = false, triggerRect }) {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  activeOwnerHide = ownerHide
  hoverTooltipState.text = text
  hoverTooltipState.variant = variant
  hoverTooltipState.wrap = wrap
  hoverTooltipState.triggerRect = triggerRect
  hoverTooltipState.visible = true
}

export function scheduleHideHoverTooltip(ownerHide, delayMs = 100) {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  hideTimeout = setTimeout(() => {
    hideHoverTooltip(ownerHide)
  }, delayMs)
}

export function buildHoverTooltipStyle(triggerRect, popupWidth = 0, popupHeight = 0) {
  if (!triggerRect) {
    return {}
  }

  const gap = 6
  const centerX = triggerRect.left + triggerRect.width / 2
  let left = centerX

  if (popupWidth > 0) {
    const halfWidth = popupWidth / 2
    const minCenter = VIEWPORT_PADDING + halfWidth
    const maxCenter = window.innerWidth - VIEWPORT_PADDING - halfWidth
    left = Math.max(minCenter, Math.min(maxCenter, centerX))
  }

  const spaceAbove = triggerRect.top - VIEWPORT_PADDING
  const placeBelow = popupHeight > 0 && spaceAbove < popupHeight + gap

  if (placeBelow) {
    return {
      position: 'fixed',
      top: `${triggerRect.bottom + gap}px`,
      left: `${left}px`,
      transform: 'translate(-50%, 0)',
    }
  }

  return {
    position: 'fixed',
    top: `${triggerRect.top - gap}px`,
    left: `${left}px`,
    transform: 'translate(-50%, -100%)',
  }
}
