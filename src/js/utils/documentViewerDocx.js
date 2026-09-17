export const DOCX_PAGE_GAP = 24
export const DOCX_PAGES_FIT_WIDTH = 0

export function countDocxPages(host) {
  return host?.querySelectorAll('section.docx')?.length || 0
}

export function docxAutoColumns(availW, pageW, pageCount = 1, gap = DOCX_PAGE_GAP) {
  const width = Number(pageW) || 0
  const space = Number(availW) || 0
  const pages = Math.max(1, Number(pageCount) || 1)
  if (width <= 0 || space <= 0) {
    return 1
  }
  const fitted = Math.floor((space + gap) / (width + gap))
  return Math.min(pages, Math.max(1, fitted))
}

export function docxGridColumns(perView, compact = false, availW = 0, pageW = 0, pageCount = 1) {
  if (compact) {
    return 1
  }
  const mode = Number(perView)
  if (mode === DOCX_PAGES_FIT_WIDTH || mode >= 4) {
    return docxAutoColumns(availW, pageW, pageCount)
  }
  if (mode >= 2) {
    return 2
  }
  return 1
}

export function docxPageAtViewport(host, stage) {
  const pages = host?.querySelectorAll('section.docx')
  if (!pages?.length || !stage) {
    return 1
  }
  const stageBox = stage.getBoundingClientRect()
  const mid = stageBox.top + stageBox.height / 2
  let best = 1
  let bestDist = Infinity
  pages.forEach((el, index) => {
    const box = el.getBoundingClientRect()
    const dist = Math.abs(box.top + box.height / 2 - mid)
    if (dist < bestDist) {
      bestDist = dist
      best = index + 1
    }
  })
  return best
}

export function measureDocxNative(host) {
  const wrapper = host?.querySelector('.docx-wrapper')
  const pages = wrapper?.querySelectorAll('section.docx')
  const page = pages?.[0]
  if (!wrapper || !page) {
    return null
  }
  const pageW = page.offsetWidth
  let paperH = 0
  let contentH = 0
  pages.forEach((el) => {
    const paper = parseFloat(window.getComputedStyle(el).minHeight) || 0
    if (paper > paperH) {
      paperH = paper
    }
    if (el.offsetHeight > contentH) {
      contentH = el.offsetHeight
    }
  })
  const pageH = Math.max(paperH, contentH) || page.offsetHeight
  if (!pageW || !pageH) {
    return null
  }
  return { pageW, pageH }
}

export function computeDocxFitStyle(native, availW, cols = 1, pageCount = 1, gap = DOCX_PAGE_GAP) {
  if (!native?.pageW || !native?.pageH) {
    return {}
  }
  const columnCount = Math.max(1, Number(cols) || 1)
  const pages = Math.max(1, Number(pageCount) || 1)
  const rowWidth = columnCount * native.pageW + Math.max(0, columnCount - 1) * gap
  const rows = Math.ceil(pages / columnCount)
  const wrapperH = rows * native.pageH + Math.max(0, rows - 1) * gap
  // Высота всего документа в min() сжимает лист в узкую полоску — по вертикали листаем.
  const scale = Math.min(1, availW / rowWidth)
  if (!Number.isFinite(scale) || scale <= 0) {
    return {}
  }
  const rounded = Math.round(scale * 1000) / 1000
  return {
    '--docx-fit-scale': String(rounded),
    '--docx-page-width': `${native.pageW}px`,
    '--docx-wrapper-width': `${rowWidth}px`,
    '--docx-wrapper-height': `${wrapperH}px`,
    '--docx-cols': String(columnCount),
    '--docx-page-height': `${native.pageH}px`,
  }
}

export async function renderDocxDocument(buffer, host) {
  host.replaceChildren()
  const { renderAsync } = await import('docx-preview')
  await renderAsync(buffer, host, undefined, {
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    breakPages: true,
    // Word кладёт границы страниц в lastRenderedPageBreak; иначе одна секция на весь файл.
    ignoreLastRenderedPageBreak: false,
    experimental: true,
  })
}

export function fitDocxToStage(host, stage, native, pad, perView = 1, pageCount = 0, compact = false) {
  if (!host || !stage) {
    return { native, style: {} }
  }
  const measured = native || measureDocxNative(host)
  if (!measured) {
    return { native: measured, style: {} }
  }
  const availW = Math.max(80, stage.offsetWidth - pad)
  const pages = pageCount || countDocxPages(host) || 1
  const cols = docxGridColumns(perView, compact, availW, measured.pageW, pages)
  return {
    native: measured,
    style: computeDocxFitStyle(measured, availW, cols, pages),
  }
}