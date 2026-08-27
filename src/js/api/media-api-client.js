import { apiClient } from '@/js/api/manager'
import { clientEnv } from '@/js/clientEnv.js'
import { tGlobal } from '@/i18n/index.js'
import { showError } from '@/js/utils/toast.js'

const UPLOAD_TOKEN_ENDPOINT = 'utils/media/upload-token/'

function parseCsvSet(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

const LOCAL_MICROSERVICE_MODULES = parseCsvSet(clientEnv.microserviceModules)

/**
 * Токен для target_dir модуля — у процесса модуля на этом хосте,
 * иначе у ядра. Так файлы не уезжают на чужой media_api.
 */
export function resolveUploadTokenEndpoint(targetDir = '', tokenEndpoint) {
  if (tokenEndpoint) {
    return tokenEndpoint
  }
  if (clientEnv.moduleRuntime !== 'microservice') {
    return UPLOAD_TOKEN_ENDPOINT
  }
  const prefix = String(targetDir || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)[0] || ''
  if (prefix && LOCAL_MICROSERVICE_MODULES.has(prefix)) {
    return `${prefix}/media/upload-token/`
  }
  return UPLOAD_TOKEN_ENDPOINT
}

function throwUploadHttpError(status, data) {
  if (status === 429) {
    const message = tGlobal('errors.api.tooManyRequests')
    showError(message)
    throw Object.assign(new Error(message), { status })
  }
  if (status === 413) {
    const message = tGlobal('errors.api.payloadTooLarge')
    showError(message)
    throw Object.assign(new Error(message), { status })
  }
  throw new Error(data?.error || `Upload failed: ${status}`)
}

/**
 * Клиент для работы с media_api (загрузка файлов через CDN-сервис).
 *
 * Лимиты размера — через buildMediaUploadOptions из `@/js/mediaUploadLimits.js`
 * (дефолт CLIENT_MEDIA_UPLOAD_MAX_SIZE; модуль может выше — до HARD_MAX).
 *
 * Типичный flow:
 *   import { buildMediaUploadOptions } from '@/js/mediaUploadLimits.js'
 *   const result = await mediaApiClient.upload(
 *     file,
 *     buildMediaUploadOptions({ targetDir: 'avatars/', feature: 'avatar' }),
 *   )
 *   // result = { uuid, path, original_name, size, content_type }
 */
class MediaApiClient {
  constructor() {
    /** @type {Map<string, { session: { upload_url: string, token: string }, expiresAt: number }>} */
    this._sharedTokens = new Map()
  }

  _tokenCacheKey({ targetDir = '', maxSize, allowedTypes, tokenEndpoint } = {}) {
    return JSON.stringify({
      targetDir,
      maxSize: maxSize ?? null,
      allowedTypes: allowedTypes || null,
      tokenEndpoint: resolveUploadTokenEndpoint(targetDir, tokenEndpoint),
    })
  }

  /**
   * Запросить upload-токен у процесса, который делит диск с media_api.
   * Модуль в MICROSERVICE_MODULES — свой эндпоинт; иначе ядро.
   * @param {Object} options
   * @param {string}  [options.targetDir='']      - целевая директория внутри хранилища
   * @param {number}  [options.maxSize]            - макс. размер файла (байт)
   * @param {string[]} [options.allowedTypes]      - разрешённые расширения (['pdf','docx'])
   * @param {string}  [options.tokenEndpoint]     - явный путь, если не выводить из targetDir
   * @returns {Promise<{upload_url: string, token: string}>}
   */
  async getUploadToken({ targetDir = '', maxSize, allowedTypes, tokenEndpoint } = {}) {
    const body = { target_dir: targetDir }
    if (maxSize != null) body.max_size = maxSize
    if (allowedTypes) body.allowed_types = allowedTypes

    const response = await apiClient.post(
      resolveUploadTokenEndpoint(targetDir, tokenEndpoint),
      body,
    )
    if (!response.success) {
      throw new Error(response.message || 'Не удалось получить upload-токен')
    }
    return response.data
  }

  /**
   * Токен с тем же targetDir/maxSize/types на время жизни HMAC (с запасом).
   * Для пакетной загрузки в один каталог.
   */
  async _getReusableUploadToken(options = {}) {
    const key = this._tokenCacheKey(options)
    const cached = this._sharedTokens.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.session
    }
    const session = await this.getUploadToken(options)
    this._sharedTokens.set(key, {
      session,
      expiresAt: Date.now() + 240000,
    })
    return session
  }

  /**
   * Загрузить файл напрямую в media_api по готовому токену.
   * @param {File} file                    - объект File
   * @param {string} uploadUrl             - URL загрузки (от getUploadToken)
   * @param {string} token                 - upload-токен  (от getUploadToken)
   * @param {Function} [onProgress]        - колбэк прогресса (0..1)
   * @returns {Promise<{uuid, path, original_name, size, content_type}>}
   */
  async uploadFile(file, uploadUrl, token, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('token', token)

    if (typeof onProgress !== 'function') {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throwUploadHttpError(response.status, error)
      }

      return response.json()
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', uploadUrl)

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const total = event.total || file.size || 0
        if (!total) return
        onProgress(Math.min(1, event.loaded / total))
      }

      xhr.onload = () => {
        let data = null
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : null
        } catch {
          data = null
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(1)
          resolve(data)
          return
        }

        try {
          throwUploadHttpError(xhr.status, data)
        } catch (error) {
          reject(error)
        }
      }

      xhr.onerror = () => {
        reject(new Error('Сетевая ошибка при загрузке файла'))
      }

      xhr.send(formData)
    })
  }

  /**
   * Комбинированный метод: получить токен + загрузить файл.
   * @param {File} file
   * @param {Object} options               - параметры для getUploadToken
   * @param {Function} [onProgress]        - колбэк прогресса
   * @returns {Promise<{uuid, path, original_name, size, content_type}>}
   */
  async upload(file, options = {}, onProgress) {
    const { reuseUploadToken, ...tokenOptions } = options
    const session = reuseUploadToken
      ? await this._getReusableUploadToken(tokenOptions)
      : await this.getUploadToken(tokenOptions)
    return this.uploadFile(file, session.upload_url, session.token, onProgress)
  }

  /**
   * Загрузить несколько файлов последовательно.
   * Один upload-токен на весь пакет (одинаковые targetDir / maxSize / types).
   * @param {File[]} files
   * @param {Object} options
   * @param {Function} [onFileProgress]    - (fileIndex, event)
   * @returns {Promise<Array>}             - массив результатов upload
   */
  async uploadMultiple(files, options = {}, onFileProgress) {
    const session = await this.getUploadToken(options)
    const results = []
    for (let i = 0; i < files.length; i++) {
      const progress = onFileProgress ? (e) => onFileProgress(i, e) : undefined
      const result = await this.uploadFile(
        files[i],
        session.upload_url,
        session.token,
        progress,
      )
      results.push(result)
    }
    return results
  }
}

export const mediaApiClient = new MediaApiClient()
export default mediaApiClient
