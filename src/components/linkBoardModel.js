export const LEVEL_KNOW = 1
export const LEVEL_ABLE = 2
export const LEVEL_MASTER = 3

export const STROKE_WIDTH = [0, 1.2, 2.4, 3.8]
export const STROKE_OPACITY = [0, 0.5, 0.7, 0.9]

export const LEVEL_KEYS = ['', 'know', 'able', 'master']

export function clampLevel(value) {
  const level = Number(value) || 0
  if (level < 1 || level > 3) {
    return 0
  }
  return level
}

export function linkKey(from, to) {
  return `${from}|${to}`
}

export function indexLinks(links) {
  const map = new Map()
  for (const link of links || []) {
    const level = clampLevel(link.level)
    if (!level || link.from == null || link.to == null) {
      continue
    }
    const from = String(link.from)
    const to = String(link.to)
    const key = linkKey(from, to)
    const previous = map.get(key)
    if (!previous || previous.level < level) {
      map.set(key, { from, to, level })
    }
  }
  return map
}

export function flattenRightItems(groups) {
  const items = []
  for (const group of groups || []) {
    for (const item of group.items || []) {
      items.push({
        ...item,
        id: String(item.id),
        groupId: group.id,
      })
    }
  }
  return items
}

export function countsFromLinks(linkMap, leftItems, rightItems) {
  const left = new Map()
  const right = new Map()
  for (const item of leftItems || []) {
    left.set(String(item.id), 0)
  }
  for (const item of rightItems || []) {
    right.set(String(item.id), 0)
  }
  for (const { from, to } of linkMap.values()) {
    if (left.has(from)) {
      left.set(from, left.get(from) + 1)
    }
    if (right.has(to)) {
      right.set(to, right.get(to) + 1)
    }
  }
  return { left, right }
}

export function orderRightGroups(groups, leftItems, linkMap) {
  const index = new Map()
  ;(leftItems || []).forEach((item, position) => {
    index.set(String(item.id), position)
  })
  const barycenter = (id) => {
    let weight = 0
    let value = 0
    for (const { from, to, level } of linkMap.values()) {
      if (to !== id) {
        continue
      }
      weight += level
      value += level * (index.has(from) ? index.get(from) : 99)
    }
    return weight ? value / weight : 99
  }
  return (groups || []).map((group) => ({
    ...group,
    items: [...(group.items || [])].sort(
      (left, right) => barycenter(String(left.id)) - barycenter(String(right.id)),
    ),
  }))
}

export function weakLeftItems(leftItems, leftCounts, threshold) {
  const min = Number(threshold) || 0
  return (leftItems || []).filter((item) => (leftCounts.get(String(item.id)) || 0) < min)
}

export function orphanRightItems(rightItems, rightCounts) {
  return (rightItems || []).filter((item) => !(rightCounts.get(String(item.id))))
}

export function relatedRightIds(leftId, linkMap) {
  const ids = []
  const key = String(leftId)
  for (const { from, to } of linkMap.values()) {
    if (from === key) {
      ids.push(to)
    }
  }
  return ids
}

export function relatedLeftIds(rightId, linkMap) {
  const ids = []
  const key = String(rightId)
  for (const { from, to } of linkMap.values()) {
    if (to === key) {
      ids.push(from)
    }
  }
  return ids
}

export function relatedByLevel(leftId, linkMap) {
  const grouped = { 1: [], 2: [], 3: [] }
  const key = String(leftId)
  for (const { from, to, level } of linkMap.values()) {
    if (from === key) {
      grouped[level].push(to)
    }
  }
  return grouped
}

export function cubicPath(x1, y1, x2, y2) {
  const mid = (x1 + x2) / 2
  return `M${x1} ${y1}C${mid} ${y1},${mid} ${y2},${x2} ${y2}`
}

export function relativeBox(el, board) {
  const edge = el.getBoundingClientRect()
  const root = board.getBoundingClientRect()
  return {
    left: edge.left - root.left + board.scrollLeft,
    right: edge.right - root.left + board.scrollLeft,
    top: edge.top - root.top + board.scrollTop,
    bottom: edge.bottom - root.top + board.scrollTop,
    width: edge.width,
    height: edge.height,
  }
}

export function cycleLevel(current) {
  return ((Number(current) || 0) + 1) % 4
}

export function formatCount(n, forms, locale = 'ru') {
  const count = Math.abs(Number(n) || 0)
  const lang = String(locale || 'ru').slice(0, 2)
  let template = forms.many
  if (lang === 'en') {
    template = count === 1 ? forms.one : forms.many
  } else if (lang === 'fr') {
    template = count <= 1 ? forms.one : forms.many
  } else {
    const mod10 = count % 10
    const mod100 = count % 100
    if (mod10 === 1 && mod100 !== 11) {
      template = forms.one
    } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      template = forms.few
    } else {
      template = forms.many
    }
  }
  return String(template).replaceAll('{n}', String(count))
}

export function selectionFromHover(side, id) {
  if (!side || id == null) {
    return null
  }
  return { kind: side, id: String(id) }
}
