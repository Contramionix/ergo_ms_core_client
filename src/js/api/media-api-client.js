import { apiClient } from '@/js/api/manager'
import { tGlobal } from '@/i18n/index.js'
import { showError } from '@/js/utils/toast.js'

const UPLOAD_TOKEN_ENDPOINT = 'utils/media/upload-token/'

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

  /**
   * Запросить upload-токен у core/api.
   * @param {Object} options
   * @param {string}  [options.targetDir='']      - целевая директория внутри хранилища
   * @param {number}  [options.maxSize]            - макс. размер файла (байт)
   * @param {string[]} [options.allowedTypes]      - разрешённые расширения (['pdf','docx'])
   * @returns {Promise<{upload_url: string, token: string}>}
   */
  async getUploadToken({ targetDir = '', maxSize, allowedTypes } = {}) {
    const body = { target_dir: targetDir }
    if (maxSize != null) body.max_size = maxSize
    if (allowedTypes) body.allowed_types = allowedTypes

    const response = await apiClient.post(UPLOAD_TOKEN_ENDPOINT, body)
    if (!response.success) {
      throw new Error(response.message || 'Не удалось получить upload-токен')
    }
    return response.data
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
    const { upload_url, token } = await this.getUploadToken(options)
    return this.uploadFile(file, upload_url, token, onProgress)
  }

  /**
   * Загрузить несколько файлов последовательно.
   * @param {File[]} files
   * @param {Object} options
   * @param {Function} [onFileProgress]    - (fileIndex, event)
   * @returns {Promise<Array>}             - массив результатов upload
   */
  async uploadMultiple(files, options = {}, onFileProgress) {
    const results = []
    for (let i = 0; i < files.length; i++) {
      const progress = onFileProgress ? (e) => onFileProgress(i, e) : undefined
      const result = await this.upload(files[i], options, progress)
      results.push(result)
    }
    return results
  }
}

export const mediaApiClient = new MediaApiClient()
export default mediaApiClient
