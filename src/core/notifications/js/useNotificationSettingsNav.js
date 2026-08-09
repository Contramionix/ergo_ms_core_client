/**
 * Якорная навигация панели настроек уведомлений (связь UserSettingsNav ↔ NotificationsPanel).
 */

import { nextTick, ref, shallowRef } from 'vue'

export const NOTIFICATION_NAV_KEY = Symbol('notificationNav')

/** Линия scroll spy: доля высоты scroll-root сверху */
const SPY_LINE_RATIO = 0.16

export function anchorIdBrowser() {
  return 'notif-browser'
}

export function anchorIdRetention() {
  return 'notif-retention'
}

export function anchorIdGlobal() {
  return 'notif-global'
}

export function anchorIdModules() {
  return 'notif-modules'
}

export function anchorIdModule(module) {
  return `notif-module-${module}`
}

export function anchorIdCategory(module, category) {
  return `notif-${module}-${category}`
}

const CORE_ANCHOR_IDS = [
  anchorIdBrowser(),
  anchorIdRetention(),
  anchorIdGlobal(),
]

function isModuleRelatedAnchor(sections, anchorId) {
  if (!anchorId) return false
  if (anchorId === anchorIdModules()) return true
  return Boolean(findModuleForAnchor(sections, anchorId))
}

function collectVisibleAnchorIds(
  sections = [],
  expandedModulesSet,
  modulesGroupExpanded = true,
) {
  const ids = [...CORE_ANCHOR_IDS]
  if (!sections.length) return ids

  ids.push(anchorIdModules())
  if (!modulesGroupExpanded) return ids

  for (const section of sections) {
    ids.push(anchorIdModule(section.module))
    if (expandedModulesSet?.has?.(section.module)) {
      for (const category of section.categories || []) {
        ids.push(anchorIdCategory(section.module, category.category))
      }
    }
  }
  return ids
}

function findModuleForAnchor(sections, anchorId) {
  if (!anchorId || CORE_ANCHOR_IDS.includes(anchorId) || anchorId === anchorIdModules()) {
    return null
  }
  for (const section of sections) {
    if (anchorId === anchorIdModule(section.module)) {
      return section.module
    }
    for (const category of section.categories || []) {
      if (anchorId === anchorIdCategory(section.module, category.category)) {
        return section.module
      }
    }
  }
  return null
}

export function createNotificationNavController(panelWrapRef) {
  const sections = shallowRef([])
  const activeAnchorId = ref(anchorIdBrowser())
  const expandedModules = ref(new Set())
  const modulesGroupExpanded = ref(true)
  let observedAnchorIds = []
  let spyScrollHandler = null
  let observerLocked = false
  let unlockTimer = null
  let scrollSettleHandler = null

  function getScrollRoot() {
    return panelWrapRef.value || null
  }

  function clearScrollSettle() {
    const root = getScrollRoot()
    if (root && scrollSettleHandler) {
      root.removeEventListener('scroll', scrollSettleHandler)
    }
    scrollSettleHandler = null
  }

  function unlockObserver({ refreshActive = true } = {}) {
    observerLocked = false
    if (unlockTimer) {
      clearTimeout(unlockTimer)
      unlockTimer = null
    }
    clearScrollSettle()
    if (refreshActive) {
      updateActiveFromScroll()
    }
  }

  /**
   * Пока идёт программный скролл / раскрытие секции, scroll spy
   * не должен дёргать активный пункт меню.
   */
  function lockObserver(durationMs = 700) {
    observerLocked = true
    if (unlockTimer) clearTimeout(unlockTimer)
    clearScrollSettle()

    const root = getScrollRoot()
    if (root) {
      let settleTimer = null
      scrollSettleHandler = () => {
        if (settleTimer) clearTimeout(settleTimer)
        settleTimer = setTimeout(() => {
          unlockObserver()
        }, 100)
      }
      root.addEventListener('scroll', scrollSettleHandler, { passive: true })
    }

    unlockTimer = setTimeout(() => {
      unlockObserver()
    }, durationMs)
  }

  function isModuleExpanded(module) {
    return expandedModules.value.has(module)
  }

  function isModulesGroupExpanded() {
    return modulesGroupExpanded.value
  }

  async function expandModulesGroup() {
    if (modulesGroupExpanded.value) return
    modulesGroupExpanded.value = true
    lockObserver(400)
    await nextTick()
    syncAnchors()
  }

  async function toggleModulesGroupExpanded() {
    modulesGroupExpanded.value = !modulesGroupExpanded.value
    lockObserver(400)
    await nextTick()
    syncAnchors()
  }

  async function expandModule(module) {
    if (!module || expandedModules.value.has(module)) return
    await expandModulesGroup()
    expandedModules.value = new Set([...expandedModules.value, module])
    lockObserver(400)
    await nextTick()
    syncAnchors()
  }

  async function toggleModuleExpanded(module) {
    await expandModulesGroup()
    const next = new Set(expandedModules.value)
    if (next.has(module)) {
      next.delete(module)
    } else {
      next.add(module)
    }
    expandedModules.value = next
    lockObserver(400)
    await nextTick()
    syncAnchors()
  }

  function initExpandedModules(sectionsList) {
    expandedModules.value = new Set((sectionsList || []).map((s) => s.module))
    if ((sectionsList || []).length) {
      modulesGroupExpanded.value = true
    }
  }

  function scrollElementIntoRoot(root, el) {
    const rootRect = root.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const scrollMargin = 12
    const top = elRect.top - rootRect.top + root.scrollTop - scrollMargin
    const maxTop = Math.max(0, root.scrollHeight - root.clientHeight)
    const nextTop = Math.min(Math.max(0, top), maxTop)
    if (Math.abs(root.scrollTop - nextTop) < 2) return
    root.scrollTo({ top: nextTop, behavior: 'smooth' })
  }

  async function scrollToAnchor(anchorId) {
    const root = getScrollRoot()
    if (!root || !anchorId) return

    if (isModuleRelatedAnchor(sections.value, anchorId)) {
      await expandModulesGroup()
      await nextTick()
    }

    const module = findModuleForAnchor(sections.value, anchorId)
    if (module && !isModuleExpanded(module)) {
      await expandModule(module)
      await nextTick()
    }

    const el = root.querySelector(`#${CSS.escape(anchorId)}`)
    if (!el) return

    // Сразу фиксируем активный пункт; spy не должен перебить его во время скролла.
    activeAnchorId.value = anchorId
    lockObserver(800)
    scrollElementIntoRoot(root, el)
  }

  /**
   * Классический scroll spy: активен последний якорь, чей верх выше линии
   * SPY_LINE_RATIO от верха scroll-root.
   */
  function updateActiveFromScroll() {
    if (observerLocked) return
    const root = getScrollRoot()
    if (!root || !observedAnchorIds.length) return

    const rootRect = root.getBoundingClientRect()
    const spyY = rootRect.top + root.clientHeight * SPY_LINE_RATIO

    let bestId = null
    for (const id of observedAnchorIds) {
      const el = root.querySelector(`#${CSS.escape(id)}`)
      if (!el) continue
      if (el.getBoundingClientRect().top <= spyY) {
        bestId = id
      }
    }

    if (!bestId) {
      bestId = observedAnchorIds.find((id) => root.querySelector(`#${CSS.escape(id)}`)) || null
    }

    if (bestId && bestId !== activeAnchorId.value) {
      activeAnchorId.value = bestId
    }
  }

  function teardownObserver() {
    const root = getScrollRoot()
    if (root && spyScrollHandler) {
      root.removeEventListener('scroll', spyScrollHandler)
    }
    spyScrollHandler = null
    observedAnchorIds = []
    unlockObserver({ refreshActive: false })
  }

  function setupObserver(anchorIds) {
    const root = getScrollRoot()
    if (root && spyScrollHandler) {
      root.removeEventListener('scroll', spyScrollHandler)
      spyScrollHandler = null
    }

    observedAnchorIds = Array.isArray(anchorIds) ? [...anchorIds] : []
    if (!root || !observedAnchorIds.length) return

    spyScrollHandler = () => {
      updateActiveFromScroll()
    }
    root.addEventListener('scroll', spyScrollHandler, { passive: true })
    updateActiveFromScroll()
  }

  function setSections(nextSections) {
    const next = Array.isArray(nextSections) ? nextSections : []
    const wasEmpty = sections.value.length === 0
    sections.value = next
    if (wasEmpty && next.length) {
      initExpandedModules(next)
    }
  }

  function syncAnchors() {
    const ids = collectVisibleAnchorIds(
      sections.value,
      expandedModules.value,
      modulesGroupExpanded.value,
    )
    setupObserver(ids)
    return ids
  }

  return {
    sections,
    activeAnchorId,
    expandedModules,
    modulesGroupExpanded,
    setSections,
    scrollToAnchor,
    teardownObserver,
    syncAnchors,
    isModuleExpanded,
    toggleModuleExpanded,
    expandModule,
    isModulesGroupExpanded,
    toggleModulesGroupExpanded,
    expandModulesGroup,
  }
}