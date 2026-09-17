export function countDocxPages(host) {
  return host?.querySelectorAll('section.docx')?.length || 0
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
  const page = wrapper?.querySelector('section.docx')
  if (!wrapper || !page) {
    return null
  }
  const pageW = page.offsetWidth
  const pageH = page.offsetHeight
  const wrapperH = wrapper.scrollHeight || wrapper.offsetHeight
  if (!pageW || !pageH) {
    return null
  }
  return { pageW, pageH, wrapperH }
}

export function computeDocxFitStyle(native, availW) {
  if (!native?.pageW) {
    return {}
  }
  // Высота всего документа в min() сжимает лист в узкую полоску — по вертикали листаем.
  const scale = Math.min(1, availW / native.pageW)
  if (!Number.isFinite(scale) || scale <= 0) {
    return {}
  }
  const rounded = Math.round(scale * 1000) / 1000
  return {
    '--docx-fit-scale': String(rounded),
    '--docx-page-width': `${native.pageW}px`,
    '--docx-wrapper-height': `${native.wrapperH}px`,
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

export function fitDocxToStage(host, stage, native, pad) {
  if (!host || !stage) {
    return { native, style: {} }
  }
  const measured = native || measureDocxNative(host)
  if (!measured) {
    return { native: measured, style: {} }
  }
  return {
    native: measured,
    style: computeDocxFitStyle(
      measured,
      Math.max(80, stage.offsetWidth - pad),
    ),
  }
}
