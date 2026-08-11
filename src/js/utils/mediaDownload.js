/**
 * Скачивание и открытие файлов по URL (signed media_api и др.).
 *
 * Не использовать target=_blank для attachment: вкладка мигает и закрывается
 * после Content-Disposition: attachment.
 *
 * Не использовать скрытый iframe: CSP `frame-ancestors 'none'` и X-Frame-Options: DENY
 * блокируют framing `/serve/` — скачивание не начинается.
 *
 * Режимы:
 * - attachment (по умолчанию) — тихий download через `<a download>` + ?download=1
 * - blob — fetch → object URL (контроль имени; не для очень больших файлов)
 * - new_tab — открыть в новой вкладке для просмотра (без force download)
 */

import { downloadBlob, extractFilenameFromHeaders } from './file-helpers.js'

export const MEDIA_DOWNLOAD_MODE = Object.freeze({
  ATTACHMENT: 'attachment',
  BLOB: 'blob',
  NEW_TAB: 'new_tab',
})

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

function downloadViaAnchor(url, filename) {
  const href = withMediaDownloadParam(url)
  const anchor = document.createElement('a')
  anchor.href = href
  // Имя подсказки; при redirect / cross-origin браузер может взять имя из Content-Disposition
  if (filename) {
    anchor.setAttribute('download', filename)
  } else {
    anchor.setAttribute('download', '')
  }
  anchor.rel = 'noopener'
  anchor.style.cssText = 'display:none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  return true
}

function openInNewTab(url) {
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  return Boolean(win)
}

async function downloadViaBlob(url, filename) {
  const response = await fetch(url, { credentials: 'same-origin', mode: 'cors' })
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

  // attachment — без iframe (CSP frame-ancestors) и без новой вкладки
  return downloadViaAnchor(url, options.filename)
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
