import { canGoNext, stepStartPage } from '@/js/utils/documentViewerLayout.js'

export function handlePdfStageWheel(event, ctx) {
  if (event.ctrlKey) {
    event.preventDefault()
    ctx.changeZoom(event.deltaY > 0 ? -ctx.zoomStep : ctx.zoomStep)
    return null
  }
  const stage = ctx.stage
  if (!stage || ctx.pageCount <= 1) {
    return null
  }
  const delta = event.deltaY
  if (delta === 0) {
    return null
  }
  const goingDown = delta > 0
  const atTop = stage.scrollTop <= 1
  const atBottom = stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 1
  const canFlip =
    (goingDown && atBottom && canGoNext(ctx.page, ctx.pagesPerView, ctx.pageCount))
    || (!goingDown && atTop && ctx.page > 1)
  if (!canFlip) {
    return null
  }
  event.preventDefault()
  const now = Date.now()
  if (now - ctx.wheelAt < ctx.wheelPageMs) {
    return null
  }
  return {
    wheelAt: now,
    scrollAfterRender: goingDown ? 'top' : 'bottom',
    page: stepStartPage(ctx.page, goingDown ? 1 : -1, ctx.pagesPerView, ctx.pageCount),
  }
}

export function bindViewerStage(el, onWheel, observer) {
  if (!el) {
    return
  }
  el.addEventListener('wheel', onWheel, { passive: false })
  observer?.observe(el)
}

export function unbindViewerStage(el, onWheel, observer) {
  if (!el) {
    return
  }
  el.removeEventListener('wheel', onWheel)
  observer?.unobserve(el)
}
