/**
 * Скачивание и открытие файлов по URL (signed media_api и др.).
 *
 * Не использовать target=_blank для attachment: вкладка мигает и закрывается
 * после Content-Disposition: attachment.
 *
 * Режимы:
 * - attachment (по умолчанию) — тихий download через скрытый iframe + ?download=1
 * - blob — fetch → object URL (контроль имени; не для очень больших файлов)
 * - new_tab — открыть в новой вкладке для просмотра (без force download)
 */

import { downloadBlob, extractFilenameFromHeaders } from './file-helpers.js'

export const MEDIA_DOWNLOAD_MODE = Object.freeze({
  ATTACHMENT: 'attachment',
  BLOB: 'blob',
  NEW_TAB: 'new_tab',
})

const IFRAME_CLEANUP_MS = 60_000

/**
 * Добавить ?download=1 (media_api → Content-Disposition: attachment).
 * @param {string} url
 * @returns {string}
 */
export function withMediaDownloadParam(url) {
  if (!url) return url
  try {
    const parsed = new URL(url, window.location.origin)
    if (!parsed.searchParams.has('download')) {
      parsed.searchParams.set('download', '1')
    }
    return parsed.toString()
  } catch {
    if (/[?&]download=/.test(url)) return url
    return `${url}${url.includes('?') ? '&' : '?'}download=1`
  }
}

/**
 * Убрать force-download из query (для inline / просмотра в вкладке).
 * @param {string} url
 * @returns {string}
 */
export function withoutMediaDownloadParam(url) {
  if (!url) return url
  try {
    const parsed = new URL(url, window.location.origin)
    parsed.searchParams.delete('download')
    return parsed.toString()
  } catch {
    return url
      .replace(/([?&])download=[^&]*&?/i, '$1')
      .replace(/[?&]$/, '')
  }
}

function downloadViaIframe(url) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.tabIndex = -1
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none'
  iframe.src = url
  document.body.appendChild(iframe)
  window.setTimeout(() => {
    iframe.remove()
  }, IFRAME_CLEANUP_MS)
  return true
}

function openInNewTab(url) {
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  return Boolean(win)
}

async function downloadViaBlob(url, filename) {
  const response = await fetch(url, { credentials: 'omit', mode: 'cors' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const blob = await response.blob()
  const name =
    filename ||
    extractFilenameFromHeaders(
      { 'content-disposition': response.headers.get('content-disposition') },
      'download',
    )
  downloadBlob(blob, name)
  return true
}

/**
 * Скачать или открыть файл по URL.
 *
 * @param {string} url
 * @param {{
 *   filename?: string,
 *   mode?: 'attachment'|'blob'|'new_tab',
 * }} [options]
 * @returns {Promise<boolean>}
 */
export async function downloadMedia(url, options = {}) {
  if (!url) return false

  const mode = options.mode || MEDIA_DOWNLOAD_MODE.ATTACHMENT

  if (mode === MEDIA_DOWNLOAD_MODE.NEW_TAB) {
    return openInNewTab(withoutMediaDownloadParam(url))
  }

  if (mode === MEDIA_DOWNLOAD_MODE.BLOB) {
    return downloadViaBlob(url, options.filename)
  }

  // attachment — silent, без новой вкладки
  return downloadViaIframe(withMediaDownloadParam(url))
}

/**
 * Ответ API вида { download_url, filename }.
 *
 * @param {{ download_url?: string, url?: string, filename?: string }|null|undefined} result
 * @param {{ mode?: 'attachment'|'blob'|'new_tab', filename?: string }} [options]
 * @returns {Promise<boolean>}
 */
export async function downloadMediaFromResult(result, options = {}) {
  const url = result?.download_url || result?.url
  const filename = options.filename ?? result?.filename
  return downloadMedia(url, { ...options, filename })
}
