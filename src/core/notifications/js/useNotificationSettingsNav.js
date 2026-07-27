/**
 * Якорная навигация панели настроек уведомлений (связь UserSettingsNav ↔ NotificationsPanel).
 */

import { nextTick, ref, shallowRef } from 'vue'

export const NOTIFICATION_NAV_KEY = Symbol('notificationNav')

export function anchorIdGlobal() {
  return 'notif-global'
}

export function anchorIdModule(module) {
  return `notif-module-${module}`
}

export function anchorIdCategory(module, category) {
  return `notif-${module}-${category}`
}

export function collectAnchorIds(sections = []) {
  const ids = [anchorIdGlobal()]
  for (const section of sections) {
    ids.push(anchorIdModule(section.module))
    for (const category of section.categories || []) {
      ids.push(anchorIdCategory(section.module, category.category))
    }
  }
  return ids
}

export function collectVisibleAnchorIds(sections = [], expandedModulesSet) {
  const ids = [anchorIdGlobal()]
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
  if (!anchorId || anchorId === anchorIdGlobal()) return null
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
  const activeAnchorId = ref(anchorIdGlobal())
  const expandedModules = ref(new Set())
  let observer = null
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

  function unlockObserver() {
    observerLocked = false
    if (unlockTimer) {
      clearTimeout(unlockTimer)
      unlockTimer = null
    }
    clearScrollSettle()
  }

  /**
   * Пока идёт программный скролл / раскрытие секции, IntersectionObserver
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

  async function expandModule(module) {
    if (!module || expandedModules.value.has(module)) return
    expandedModules.value = new Set([...expandedModules.value, module])
    lockObserver(400)
    await nextTick()
    syncAnchors()
  }

  async function toggleModuleExpanded(module) {
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

    const module = findModuleForAnchor(sections.value, anchorId)
    if (module && !isModuleExpanded(module)) {
      await expandModule(module)
      await nextTick()
    }

    const el = root.querySelector(`#${CSS.escape(anchorId)}`)
    if (!el) return

    // Сразу фиксируем активный пункт; observer не должен перебить его во время скролла.
    activeAnchorId.value = anchorId
    lockObserver(800)
    scrollElementIntoRoot(root, el)
  }

  function teardownObserver() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    unlockObserver()
  }

  function setupObserver(anchorIds) {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    const root = getScrollRoot()
    if (!root || !anchorIds?.length) return

    const visible = new Map()

    observer = new IntersectionObserver(
      (entries) => {
        if (observerLocked) return
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        let bestId = null
        let bestRatio = 0
        for (const id of anchorIds) {
          const ratio = visible.get(id) || 0
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestId = id
          }
        }
        if (bestId && bestId !== activeAnchorId.value) {
          activeAnchorId.value = bestId
        }
      },
      {
        root,
        rootMargin: '-12% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    for (const id of anchorIds) {
      const el = root.querySelector(`#${CSS.escape(id)}`)
      if (el) observer.observe(el)
    }
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
    const ids = collectVisibleAnchorIds(sections.value, expandedModules.value)
    setupObserver(ids)
    return ids
  }

  return {
    sections,
    activeAnchorId,
    expandedModules,
    setSections,
    scrollToAnchor,
    setupObserver,
    teardownObserver,
    syncAnchors,
    collectAnchorIds,
    collectVisibleAnchorIds,
    isModuleExpanded,
    toggleModuleExpanded,
    expandModule,
    initExpandedModules,
  }
}
