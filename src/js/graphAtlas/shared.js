const TER = ['#7E8FD6', '#4FA89A', '#D39A4C', '#B67DB8', '#6FA5CF', '#9DAE5A', '#D17C73', '#7AA88A', '#C2A160', '#8C88C9']

const DEFAULT_STRINGS = {
  stats: '{nodes} nodes: {hub} hubs and {leaf} leaves. {edges} edges, {clusters} areas.',
  composed: 'composed of',
  includes: 'includes',
  similar: 'similar',
  hub: 'Hub',
  leaf: 'Node',
  isolated: 'Unlinked',
  isolatedArea: 'unlinked',
  level: 'level',
  area: 'Area',
  noDescription: 'No description.',
  more: 'Show more',
  less: 'Show less',
  groupComposed: 'Composed of',
  groupInHub: 'Part of hub',
  groupIncludes: 'Includes',
  groupIncludedIn: 'Included in',
  groupSimilarHub: 'Similar hubs',
  groupSimilarLeaf: 'Similar nodes',
  moreRels: 'and {n} more. Raise the strength threshold to shorten the list.',
  noRels: 'No links at the current filters.',
  nothing: 'Nothing found. Try part of a word.',
  synthetic: '{name} (synth.)',
  syntheticDesc: 'Synthetic node for load testing.',
  openCard: 'Open card',
  strength: 'strength {n}',
  counts: '{hub} hubs, {leaf} nodes',
}

function fmt(template, vars) {
  return String(template || '')
    .replace(/%(\w+)%/g, (_, key) => vars[key] ?? '')
    .replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

const alphaCache = new Map()

function alpha(hex, a) {
  const key = `${hex}|${a}`
  const hit = alphaCache.get(key)
  if (hit) return hit
  const h = String(hex || '').trim().replace('#', '')
  if (h.length < 6) {
    const fallback = `rgba(21,32,42,${a})`
    alphaCache.set(key, fallback)
    return fallback
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const out = `rgba(${r},${g},${b},${a})`
  alphaCache.set(key, out)
  return out
}

function localXY(cv, ev) {
  const box = cv.getBoundingClientRect()
  return [ev.clientX - box.left, ev.clientY - box.top]
}

function reducedMotion() {
  return document.documentElement.getAttribute('data-ergo-motion') === 'reduce'
    || matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const EDGE_KIND_SIMILAR = 2
/** Similar внутри области — когда узлы уже читаются, не на общем плане. */
export const SIMILAR_NEAR_K = 1
/** Межобластные similar: уверенный хвост, не пол сборки 0.35–0.40. */
export const SIMILAR_BRIDGE_MIN_W = 0.5
const SIMILAR_BRIDGE_MAX = 16
/** Потолок линий в кадре: средний масштаб / близко. Не удаление из снимка. */
export const VIEW_EDGE_CAP_MID = 600
export const VIEW_EDGE_CAP_NEAR = 1500
export const VIEW_EDGE_MID_K = 1.2

export function viewEdgeCap(k) {
  return k < VIEW_EDGE_MID_K ? VIEW_EDGE_CAP_MID : VIEW_EDGE_CAP_NEAR
}

/** Листья между областями рябят карту; хаб может держать мост. */
export function leafLeafCrossCluster(sn, tn) {
  return !sn.hub && !tn.hub && sn.cl !== tn.cl
}

export function pickSimilarBridges(nodes, edges, ok, vis) {
  const byPair = new Map()
  edges.forEach((e, j) => {
    if (e.k !== EDGE_KIND_SIMILAR || !ok(e)) return
    const sn = nodes[e.s]
    const tn = nodes[e.t]
    if (sn.cl === tn.cl) return
    if (leafLeafCrossCluster(sn, tn)) return
    if (!vis(sn) || !vis(tn)) return
    if (e.w < SIMILAR_BRIDGE_MIN_W) return
    const key = sn.cl < tn.cl ? `${sn.cl}_${tn.cl}` : `${tn.cl}_${sn.cl}`
    const list = byPair.get(key)
    if (list) list.push(j)
    else byPair.set(key, [j])
  })
  const picked = []
  byPair.forEach((list) => {
    list.sort((a, b) => edges[b].w - edges[a].w)
    picked.push(list[0])
  })
  picked.sort((a, b) => edges[b].w - edges[a].w)
  return new Set(picked.slice(0, SIMILAR_BRIDGE_MAX))
}

export function similarLineVisible(e, sn, tn, k, bridges, edgeIndex, ego) {
  if (ego) return true
  if (e.k !== EDGE_KIND_SIMILAR) return true
  if (leafLeafCrossCluster(sn, tn)) return false
  if (sn.cl === tn.cl) return k >= SIMILAR_NEAR_K
  return bridges.has(edgeIndex)
}

export function edgeLineVisible(e, sn, tn, k, bridges, edgeIndex, ego) {
  if (ego) return true
  if (leafLeafCrossCluster(sn, tn)) return false
  return similarLineVisible(e, sn, tn, k, bridges, edgeIndex, ego)
}

export { TER, DEFAULT_STRINGS, fmt, alpha, localXY, reducedMotion }
