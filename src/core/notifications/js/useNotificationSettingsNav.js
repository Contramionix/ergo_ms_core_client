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

  function getScrollRoot() {
    return panelWrapRef.value || null
  }

  function isModuleExpanded(module) {
    return expandedModules.value.has(module)
  }

  async function expandModule(module) {
    if (!module || expandedModules.value.has(module)) return
    expandedModules.value = new Set([...expandedModules.value, module])
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
    await nextTick()
    syncAnchors()
  }

  function initExpandedModules(sectionsList) {
    expandedModules.value = new Set((sectionsList || []).map((s) => s.module))
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
    activeAnchorId.value = anchorId
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function teardownObserver() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  function setupObserver(anchorIds) {
    teardownObserver()
    const root = getScrollRoot()
    if (!root || !anchorIds?.length) return

    const visible = new Map()

    observer = new IntersectionObserver(
      (entries) => {
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
        if (bestId) {
          activeAnchorId.value = bestId
        }
      },
      {
        root,
        rootMargin: '-10% 0px -55% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
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
