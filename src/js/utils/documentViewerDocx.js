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

export function computeDocxFitStyle(native, availW, availH) {
  if (!native) {
    return {}
  }
  const scale = Math.min(availW / native.pageW, availH / native.pageH)
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
      Math.max(80, stage.offsetHeight - pad),
    ),
  }
}
