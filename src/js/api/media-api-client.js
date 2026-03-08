import { apiClient } from '@/js/api/manager'

const UPLOAD_TOKEN_ENDPOINT = 'utils/media/upload-token/'

/**
 * Клиент для работы с media_api (загрузка файлов через CDN-сервис).
 *
 * Типичный flow:
 *   const result = await mediaApiClient.upload(file, { targetDir: 'avatars/' })
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
    return response
  }

  /**
   * Загрузить файл напрямую в media_api по готовому токену.
   * @param {File} file                    - объект File
   * @param {string} uploadUrl             - URL загрузки (от getUploadToken)
   * @param {string} token                 - upload-токен  (от getUploadToken)
   * @param {Function} [onProgress]        - колбэк прогресса (event)
   * @returns {Promise<{uuid, path, original_name, size, content_type}>}
   */
  async uploadFile(file, uploadUrl, token, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('token', token)

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Upload failed: ${response.status}`)
    }

    return response.json()
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
