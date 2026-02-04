/**
 * Утилиты для работы с файлами
 */

/**
 * Скачивает blob как файл
 * @param {Blob} blob - Blob для скачивания
 * @param {string} filename - Имя файла
 */
export function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

/**
 * Извлекает имя файла из заголовков ответа
 * @param {Object} headers - Заголовки ответа
 * @param {string} defaultFilename - Имя файла по умолчанию (включая расширение)
 * @returns {string} Имя файла
 */
export function extractFilenameFromHeaders(headers, defaultFilename = 'download') {
    if (!headers?.['content-disposition']) {
        return defaultFilename
    }

    const contentDisposition = headers['content-disposition']
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    
    if (filenameMatch && filenameMatch[1]) {
        return filenameMatch[1].replace(/['"]/g, '')
    }
    
    return defaultFilename
}

/**
 * Форматирует размер файла в человекочитаемый вид
 * @param {number} bytes - Размер в байтах
 * @returns {string} Отформатированный размер
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Байт'
    const k = 1024
    const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Проверяет расширение файла
 * @param {string} filename - Имя файла
 * @param {string[]} allowedExtensions - Разрешённые расширения (например, ['.docx', '.pdf'])
 * @returns {boolean} Результат проверки
 */
export function validateFileExtension(filename, allowedExtensions) {
    const lowerName = filename.toLowerCase()
    return allowedExtensions.some(ext => lowerName.endsWith(ext.toLowerCase()))
}

/**
 * Проверяет размер файла
 * @param {number} fileSize - Размер файла в байтах
 * @param {number} maxSizeMB - Максимальный размер в мегабайтах
 * @returns {boolean} Результат проверки
 */
export function validateFileSize(fileSize, maxSizeMB) {
    return fileSize <= maxSizeMB * 1024 * 1024
}
