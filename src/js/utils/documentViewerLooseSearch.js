// Мягкий поиск формулировки в тексте PDF или DOCX: слова по порядку, а не непрерывная строка.
// Текстовый слой PDF рвёт строку на узлы без пробела, в таблице строки соседних ячеек
// перемежаются, слово переносится через дефис, а DOCX режет слово на несколько run.
// Поэтому слово запроса может совпасть со словом документа по началу или со склейкой
// двух-трёх соседних кусков, а между словами допускаются чужие слова соседней ячейки.

const WORD_RE = /[\p{L}\p{N}­]+/gu
const NEEDLE_MIN_LETTERS = 3
// Сколько слов документа можно пропустить между словами формулировки (соседние ячейки таблицы).
const GAP_WORDS = 40
const ANCHOR_WORDS = 3
const MAX_PIECES = 3
const ACCEPT_SHARE = 0.6
const BEST_SLACK = 0.1
// Короткий кусок между словами одного узла («и», запятая) подсвечивается вместе с ними.
const JOIN_GAP_CHARS = 6

function foldWord(value) {
  return String(value || '').replace(/­/g, '').toLocaleLowerCase('ru').replace(/ё/g, 'е')
}

function stemKey(word) {
  return word.length <= 5 ? word : word.slice(0, Math.max(5, word.length - 3))
}

function sameWord(needle, candidate) {
  if (needle === candidate) return true
  if (Math.abs(needle.length - candidate.length) > 3) return false
  return candidate.startsWith(stemKey(needle)) || needle.startsWith(stemKey(candidate))
}

export function needleWords(query) {
  const text = String(query || '')
    .replace(/­/g, '')
    .replace(/(\p{L})[-‐‑]\s*(?=\p{L})/gu, '$1')
  const words = []
  for (const match of text.matchAll(WORD_RE)) {
    const word = foldWord(match[0])
    if (word.length >= NEEDLE_MIN_LETTERS && word !== 'nan') words.push(word)
  }
  return words
}

function documentWords(nodes) {
  const words = []
  for (const node of nodes) {
    const text = node.textContent || ''
    for (const match of text.matchAll(WORD_RE)) {
      words.push({ node, start: match.index, end: match.index + match[0].length, text: foldWord(match[0]) })
    }
  }
  return words
}

// Слово запроса против одного слова документа или склейки соседних кусков. Возвращает
// индекс последнего занятого слова или -1.
function matchAt(needle, words, at) {
  let glued = ''
  for (let piece = 0; piece < MAX_PIECES && at + piece < words.length; piece += 1) {
    glued += words[at + piece].text
    if (sameWord(needle, glued)) return at + piece
    if (glued.length >= needle.length + 3) break
  }
  return -1
}

function align(needles, words, start, first) {
  const taken = []
  let cursor = start
  for (let index = first; index < needles.length; index += 1) {
    const limit = Math.min(words.length, cursor + GAP_WORDS)
    for (let at = cursor; at < limit; at += 1) {
      const end = matchAt(needles[index], words, at)
      if (end >= 0) {
        taken.push([at, end])
        cursor = end + 1
        break
      }
    }
  }
  if (!taken.length) return null
  const from = taken[0][0]
  const to = taken[taken.length - 1][1]
  return { taken, share: taken.length / needles.length, from, to, span: to - from }
}

function acceptable(hit, needles) {
  const need = needles.length <= 3 ? needles.length : Math.max(2, Math.ceil(needles.length * ACCEPT_SHARE))
  return hit.taken.length >= need
}

function bestHits(needles, words) {
  const found = []
  for (let first = 0; first < Math.min(ANCHOR_WORDS, needles.length); first += 1) {
    for (let at = 0; at < words.length; at += 1) {
      if (matchAt(needles[first], words, at) < 0) continue
      const hit = align(needles, words, at, first)
      if (hit && acceptable(hit, needles)) found.push(hit)
    }
  }
  found.sort((left, right) => right.share - left.share || left.span - right.span || left.from - right.from)
  const chosen = []
  const top = found.length ? found[0].share : 0
  for (const hit of found) {
    if (hit.share < top - BEST_SLACK) break
    if (chosen.some((other) => hit.from <= other.to && other.from <= hit.to)) continue
    chosen.push(hit)
  }
  return chosen.sort((left, right) => left.from - right.from)
}

function hitRanges(hit, words) {
  const segments = []
  for (const [from, to] of hit.taken) {
    for (let index = from; index <= to; index += 1) {
      const word = words[index]
      const last = segments[segments.length - 1]
      if (last && last.node === word.node && word.start - last.end <= JOIN_GAP_CHARS) {
        last.end = word.end
      } else {
        segments.push({ node: word.node, start: word.start, end: word.end })
      }
    }
  }
  return segments.map((segment) => {
    const range = document.createRange()
    range.setStart(segment.node, segment.start)
    range.setEnd(segment.node, segment.end)
    return range
  })
}

// Каждый найденный фрагмент — список диапазонов: слова формулировки, без чужих слов между ними.
export function collectLooseHits(nodes, query) {
  const needles = needleWords(query)
  if (!needles.length || !nodes.length) return []
  const words = documentWords(nodes)
  return bestHits(needles, words).map((hit) => hitRanges(hit, words))
}
