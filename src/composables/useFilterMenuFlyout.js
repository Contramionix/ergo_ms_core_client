import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

import {
  OVERLAY_MENU_FLYOUT_Z_INDEX,
  OVERLAY_MENU_Z_INDEX,
} from '@/js/utils/overlayZIndex.js'

const VIEWPORT_PADDING = 8

/**
 * Позиционирование главной панели и бокового flyout для FilterMenu.
 */
export function useFilterMenuFlyout(options = {}) {
  const hoverCloseDelay = options.hoverCloseDelay ?? 120
  const flyoutMinWidth = options.flyoutMinWidth ?? 200
  const flyoutGap = options.flyoutGap ?? 2

  const rootEl = ref(null)
  const mainPanelEl = ref(null)
  const flyoutPanelEl = ref(null)

  const isMainOpen = ref(false)
  const activeFlyoutKey = ref(null)
  const pinnedFlyoutKey = ref(null)

  const mainPanelStyle = ref({ top: '0px', left: '0px', width: '0px', zIndex: OVERLAY_MENU_Z_INDEX })
  const flyoutPanelStyle = ref({ top: '0px', left: '0px', width: '0px', zIndex: OVERLAY_MENU_FLYOUT_Z_INDEX })

  let hoverCloseTimer = null
  let suppressOutsideClick = false

  function clearHoverCloseTimer() {
    if (hoverCloseTimer !== null) {
      clearTimeout(hoverCloseTimer)
      hoverCloseTimer = null
    }
  }

  function scheduleFlyoutClose() {
    clearHoverCloseTimer()
    hoverCloseTimer = setTimeout(() => {
      if (!pinnedFlyoutKey.value) {
        activeFlyoutKey.value = null
      }
      hoverCloseTimer = null
    }, hoverCloseDelay)
  }

  function flyoutContains(target) {
    if (!(target instanceof Node)) return false
    const main = mainPanelEl.value
    const flyout = flyoutPanelEl.value
    const root = rootEl.value
    return Boolean(
      (root && root.contains(target))
      || (main && main.contains(target))
      || (flyout && flyout.contains(target)),
    )
  }

  function updateMainPanelPosition() {
    const root = rootEl.value
    if (!root) return
    const trigger = root.querySelector('.filter-menu__trigger')
    if (!trigger) return

    const triggerRect = trigger.getBoundingClientRect()
    const minWidth = Math.max(280, triggerRect.width)
    const maxWidth = Math.max(0, window.innerWidth - VIEWPORT_PADDING * 2)
    const width = Math.min(minWidth, maxWidth)
    let left = Math.min(triggerRect.left, window.innerWidth - VIEWPORT_PADDING - width)
    left = Math.max(VIEWPORT_PADDING, left)

    let top = triggerRect.bottom + 4
    const panelHeight = mainPanelEl.value?.getBoundingClientRect().height || 0
    if (panelHeight && top + panelHeight > window.innerHeight - VIEWPORT_PADDING) {
      const aboveTop = triggerRect.top - panelHeight - 4
      if (aboveTop >= VIEWPORT_PADDING) {
        top = aboveTop
      }
    }

    const rootStyle = root ? getComputedStyle(root) : null
    const menuFontSize = rootStyle?.getPropertyValue('--select-box-font-size').trim() || '1rem'
    const itemPaddingY = rootStyle?.getPropertyValue('--select-box-item-padding-y').trim() || '0.375rem'
    const itemPaddingX = rootStyle?.getPropertyValue('--select-box-item-padding-x').trim() || '0.75rem'

    mainPanelStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxWidth: `${maxWidth}px`,
      zIndex: OVERLAY_MENU_Z_INDEX,
      fontSize: menuFontSize,
      lineHeight: '1.5',
      '--select-box-font-size': menuFontSize,
      '--select-box-item-padding-y': itemPaddingY,
      '--select-box-item-padding-x': itemPaddingX,
    }
  }

  function updateFlyoutPosition(rowEl) {
    if (!(rowEl instanceof HTMLElement)) return

    const root = rootEl.value
    const rootStyle = root ? getComputedStyle(root) : null
    const menuFontSize = rootStyle?.getPropertyValue('--select-box-font-size').trim() || '1rem'
    const itemPaddingY = rootStyle?.getPropertyValue('--select-box-item-padding-y').trim() || '0.375rem'
    const itemPaddingX = rootStyle?.getPropertyValue('--select-box-item-padding-x').trim() || '0.75rem'

    const rowRect = rowEl.getBoundingClientRect()
    const maxWidth = Math.max(0, window.innerWidth - VIEWPORT_PADDING * 2)
    const width = Math.min(Math.max(flyoutMinWidth, 200), maxWidth)

    let left = rowRect.right + flyoutGap
    const fitsRight = left + width <= window.innerWidth - VIEWPORT_PADDING
    if (!fitsRight) {
      left = Math.max(VIEWPORT_PADDING, rowRect.left - flyoutGap - width)
    }

    let top = rowRect.top
    const panelHeight = flyoutPanelEl.value?.getBoundingClientRect().height || 0
    if (panelHeight) {
      top = Math.min(
        Math.max(VIEWPORT_PADDING, top),
        Math.max(VIEWPORT_PADDING, window.innerHeight - VIEWPORT_PADDING - panelHeight),
      )
    }

    flyoutPanelStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxWidth: `${maxWidth}px`,
      zIndex: OVERLAY_MENU_FLYOUT_Z_INDEX,
      fontSize: menuFontSize,
      lineHeight: '1.5',
      '--select-box-font-size': menuFontSize,
      '--select-box-item-padding-y': itemPaddingY,
      '--select-box-item-padding-x': itemPaddingX,
    }
  }

  function openMain() {
    if (isMainOpen.value) return
    isMainOpen.value = true
    activeFlyoutKey.value = null
    pinnedFlyoutKey.value = null
    nextTick(() => {
      updateMainPanelPosition()
      requestAnimationFrame(() => updateMainPanelPosition())
    })
  }

  function closeMain() {
    clearHoverCloseTimer()
    isMainOpen.value = false
    activeFlyoutKey.value = null
    pinnedFlyoutKey.value = null
  }

  function toggleMain() {
    if (isMainOpen.value) closeMain()
    else {
      suppressOutsideClick = true
      openMain()
      nextTick(() => {
        suppressOutsideClick = false
      })
    }
  }

  function openFlyout(fieldKey, rowEl, { pin = false } = {}) {
    if (!fieldKey) return
    clearHoverCloseTimer()
    activeFlyoutKey.value = fieldKey
    if (pin) {
      pinnedFlyoutKey.value = pinnedFlyoutKey.value === fieldKey ? null : fieldKey
      if (!pinnedFlyoutKey.value) {
        activeFlyoutKey.value = null
        return
      }
      activeFlyoutKey.value = pinnedFlyoutKey.value
    }
    nextTick(() => {
      updateFlyoutPosition(rowEl)
      requestAnimationFrame(() => updateFlyoutPosition(rowEl))
    })
  }

  function closeFlyout() {
    clearHoverCloseTimer()
    activeFlyoutKey.value = null
    pinnedFlyoutKey.value = null
  }

  function onRowEnter(fieldKey, rowEl) {
    if (pinnedFlyoutKey.value && pinnedFlyoutKey.value !== fieldKey) return
    openFlyout(fieldKey, rowEl)
  }

  function onRowLeave() {
    if (pinnedFlyoutKey.value) return
    scheduleFlyoutClose()
  }

  function onFlyoutEnter() {
    clearHoverCloseTimer()
  }

  function onFlyoutLeave() {
    if (pinnedFlyoutKey.value) return
    scheduleFlyoutClose()
  }

  function onDocumentMouseDown(event) {
    if (suppressOutsideClick || !isMainOpen.value) return
    if (flyoutContains(event.target)) return
    closeMain()
  }

  function onDocumentKeydown(event) {
    if (!isMainOpen.value) return
    if (event.key !== 'Escape') return
    if (activeFlyoutKey.value) {
      closeFlyout()
      event.preventDefault()
      return
    }
    closeMain()
    event.preventDefault()
  }

  function onWindowChange() {
    if (!isMainOpen.value) return
    updateMainPanelPosition()
    const activeRow = mainPanelEl.value?.querySelector('.filter-menu__row--active')
    if (activeRow && activeFlyoutKey.value) {
      updateFlyoutPosition(activeRow)
    }
  }

  onMounted(() => {
    document.addEventListener('mousedown', onDocumentMouseDown)
    document.addEventListener('keydown', onDocumentKeydown)
    window.addEventListener('resize', onWindowChange)
    window.addEventListener('scroll', onWindowChange, true)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onDocumentMouseDown)
    document.removeEventListener('keydown', onDocumentKeydown)
    window.removeEventListener('resize', onWindowChange)
    window.removeEventListener('scroll', onWindowChange, true)
    clearHoverCloseTimer()
  })

  return {
    rootEl,
    mainPanelEl,
    flyoutPanelEl,
    isMainOpen,
    activeFlyoutKey,
    pinnedFlyoutKey,
    mainPanelStyle,
    flyoutPanelStyle,
    toggleMain,
    closeMain,
    openFlyout,
    closeFlyout,
    onRowEnter,
    onRowLeave,
    onFlyoutEnter,
    onFlyoutLeave,
    updateMainPanelPosition,
    updateFlyoutPosition,
    flyoutContains,
  }
}
