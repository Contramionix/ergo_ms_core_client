import { collectLooseHits } from './documentViewerLooseSearch.js'

const HITS = 'document-viewer-hits'
const CURRENT = 'document-viewer-hit-current'

function highlightsAvailable() {
  return typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined'
}

function paintHighlight(name, ranges) {
  if (!highlightsAvailable()) {
    return
  }
  if (!ranges.length) {
    CSS.highlights.delete(name)
    return
  }
  const highlight = new Highlight()
  for (const range of ranges) {
    highlight.add(range)
  }
  CSS.highlights.set(name, highlight)
}

export function clearDocumentSearch() {
  paintHighlight(HITS, [])
  paintHighlight(CURRENT, [])
}

function textChunks(root) {
  const blocks = [...root.querySelectorAll('.document-viewer__sheet, section.docx')]
  const sources = blocks.length ? blocks : [root]
  return sources.map((block) => {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
    const nodes = []
    let node = walker.nextNode()
    while (node) {
      if (node.textContent) {
        nodes.push(node)
      }
      node = walker.nextNode()
    }
    return nodes
  }).filter((nodes) => nodes.length)
}

function prepareNeedle(query) {
  const raw = String(query || '').trim()
  if (!raw) {
    return null
  }
  const folded = raw.toLocaleLowerCase()
  if (folded.length !== raw.length) {
    return { needle: raw, fold: false }
  }
  return { needle: folded, fold: true }
}

function rangeFor(map, start, end) {
  const range = document.createRange()
  let open = false
  for (const item of map) {
    const itemEnd = item.start + item.length
    if (itemEnd <= start || item.start >= end) {
      continue
    }
    const localStart = Math.max(0, start - item.start)
    const localEnd = Math.min(item.length, end - item.start)
    if (!open) {
      range.setStart(item.node, localStart)
      open = true
    }
    range.setEnd(item.node, localEnd)
  }
  return open ? range : null
}

function rangesInChunk(nodes, needle, fold) {
  const map = []
  let haystack = ''
  let cursor = 0
  for (const node of nodes) {
    const text = node.textContent || ''
    if (!text) {
      continue
    }
    const piece = fold ? text.toLocaleLowerCase() : text
    if (piece.length !== text.length) {
      continue
    }
    map.push({ start: cursor, node, length: text.length })
    haystack += piece
    cursor += piece.length
  }
  const ranges = []
  if (!needle || haystack.length < needle.length) {
    return ranges
  }
  let from = 0
  while (from <= haystack.length - needle.length) {
    const at = haystack.indexOf(needle, from)
    if (at < 0) {
      break
    }
    const range = rangeFor(map, at, at + needle.length)
    if (range) {
      ranges.push(range)
    }
    from = at + 1
  }
  return ranges
}

export function collectSearchRanges(root, query) {
  const prepared = prepareNeedle(query)
  if (!prepared || !root) {
    return []
  }
  const ranges = []
  for (const nodes of textChunks(root)) {
    ranges.push(...rangesInChunk(nodes, prepared.needle, prepared.fold))
  }
  return ranges
}

function collectLooseHitsIn(root, query) {
  if (!root) return []
  return collectLooseHits(textChunks(root).flat(), query)
}

export function applyDocumentSearch(root, query, index = 0, options = {}) {
  const prepared = prepareNeedle(query)
  if (!prepared || !root) {
    clearDocumentSearch()
    return { ranges: [], total: 0, index: 0 }
  }
  // Мягкий поиск даёт фрагмент из нескольких диапазонов: слова формулировки без чужих слов между ними.
  const hits = options.loose
    ? collectLooseHitsIn(root, query)
    : collectSearchRanges(root, query).map((range) => [range])
  const total = hits.length
  const current = total ? ((Number(index) % total) + total) % total : 0
  const rest = total ? hits.filter((_, item) => item !== current).flat() : []
  const active = total ? hits[current] : []
  paintHighlight(HITS, rest)
  paintHighlight(CURRENT, active)
  return { ranges: hits.map((hit) => hit[0]), hits, total, index: current }
}

export function scrollSearchRange(range) {
  const node = range?.startContainer
  if (!node?.isConnected) {
    return
  }
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
  // По центру окна: с 'nearest' найденный фрагмент прилипал к нижнему краю.
  el?.scrollIntoView({ block: 'center', inline: 'nearest' })
}
