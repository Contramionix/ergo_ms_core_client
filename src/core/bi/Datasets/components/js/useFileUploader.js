import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

export function useFileUploader(tempUploadedFiles, selectedFile, isSheetPickerVisible, currentUploadFile, availableSheets, loadUserFiles, connectionId, uploadedFiles = null, selectFileCallback = null, isFinalizingRef = null, loadUnattachedFiles = null) {

  const MAX_FILES = 10
  const MAX_SIZE_MB = 200

  const getConnectionId = () => {
    return connectionId && typeof connectionId === 'object' ? connectionId.value : connectionId
  }

  async function directUploadFile(file, sheet = null) {
    const formData = new FormData()
    formData.append('file', file)
    if (sheet) formData.append('sheet', sheet)
    const res = await apiClient.upload(endpoints.bi.UploadDirect, formData, true)
    if (res.success && res.data) {
      if (loadUnattachedFiles) await loadUnattachedFiles()
      return res.data
    }
    throw new Error(res.error || 'Ошибка загрузки')
  }

  async function uploadFileAndFinalizeToUnattached(file, sheet) {
    const formData = new FormData()
    formData.append('file', file)
    const uploadRes = await apiClient.upload(endpoints.bi.Upload, formData, true)
    if (!uploadRes.success || !uploadRes.data?.temp_path) throw new Error('Ошибка временной загрузки')
    const { temp_path, original_filename, file_type } = uploadRes.data
    const base = file.name.replace(/\.xlsx$/i, '')
    const name = sheet ? `${base} – ${sheet}.xlsx` : file.name
    const finalizeData = new FormData()
    finalizeData.append('temp_path', temp_path)
    finalizeData.append('name', name)
    finalizeData.append('original_filename', original_filename)
    finalizeData.append('file_type', file_type)
    if (sheet) finalizeData.append('sheet', sheet)
    const finalizeRes = await apiClient.post(endpoints.bi.uploadFinalize, finalizeData)
    if (!finalizeRes.success || !finalizeRes.data?.id) throw new Error('Ошибка финализации')
    return finalizeRes.data
  }

  async function uploadFileRaw(formData, newName, originalFile) {
    try {
      const res = await apiClient.post(endpoints.bi.uploadFinalize, formData)
      return res
    } catch (err) {
      return { success: false, error: err }
    }
  }

  async function finalizeUploads(connectionId) {
    const finalizePromises = tempUploadedFiles.value.map(async file => {
      if (!file.temp_path) return null
      const formData = new FormData()
      formData.append('temp_path', file.temp_path)
      formData.append('name', file.name)
      formData.append('original_filename', file.original_filename)
      formData.append('file_type', file.file_type)
      formData.append('connection', connectionId)
      if (file.sheet) formData.append('sheet', file.sheet)
      const res = await uploadFileRaw(formData, file.name, file.originalFile)
      if (res && res.success && res.data && res.data.id) return res.data
      return null
    })
    const uploaded = await Promise.all(finalizePromises)
    tempUploadedFiles.value = []
    return uploaded.filter(Boolean)
  }

  async function handleSheetSelection(sheets) {
    isSheetPickerVisible.value = false
    const file = currentUploadFile.value
    if (!file || !sheets.length) return
    try {
      await Promise.all(sheets.map(sheet => uploadFileAndFinalizeToUnattached(file.originalFile, sheet)))
      if (loadUnattachedFiles) await loadUnattachedFiles()
    } catch (error) {
    }
    currentUploadFile.value = null
  }

  async function handleFileUpload(event) {
    const files = Array.from(event.target.files)
    if (files.length > MAX_FILES) {
      alert(`Можно выбрать не более ${MAX_FILES} файлов.`)
      event.target.value = ''
      return
    }

    const oversized = files.filter(file => file.size > MAX_SIZE_MB * 1024 * 1024)
    if (oversized.length > 0) {
      alert(`Файлы превышают ${MAX_SIZE_MB} МБ:\n${oversized.map(f => f.name).join(', ')}`)
      event.target.value = ''
      return
    }

    const empty = files.filter(file => file.size === 0)
    if (empty.length > 0) {
      alert(`Файлы пустые:\n${empty.map(f => f.name).join(', ')}`)
      event.target.value = ''
      return
    }

    // Разделяем файлы на xlsx и остальные
    const xlsxFiles = files.filter(f => f.name.endsWith('.xlsx'))
    const otherFiles = files.filter(f => !f.name.endsWith('.xlsx'))

    // Сначала проверяем xlsx файлы на наличие нескольких листов (параллельно)
    const xlsxChecks = await Promise.all(
      xlsxFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        try {
          const sheetRes = await apiClient.upload(endpoints.bi.xlsxSheets, formData)
          return { file, sheetRes }
        } catch (error) {
          return { file, sheetRes: null }
        }
      })
    )

    // Проверяем, есть ли файлы с несколькими листами
    const multiSheetFile = xlsxChecks.find(
      check => check.sheetRes?.success && check.sheetRes?.data?.sheets?.length > 1
    )

    if (multiSheetFile) {
      // Если нашли файл с несколькими листами, показываем диалог выбора
      const tempFile = {
        name: multiSheetFile.file.name,
        originalFile: multiSheetFile.file,
        pendingSheets: multiSheetFile.sheetRes.data.sheets,
      }
      currentUploadFile.value = tempFile
      availableSheets.value = multiSheetFile.sheetRes.data.sheets
      isSheetPickerVisible.value = true
      event.target.value = ''
      return
    }

    const uploadPromises = []
    for (const { file, sheetRes } of xlsxChecks) {
      if (sheetRes?.success && sheetRes?.data?.sheets?.length === 1) {
        uploadPromises.push(directUploadFile(file, sheetRes.data.sheets[0]))
      } else {
        uploadPromises.push(directUploadFile(file))
      }
    }
    for (const file of otherFiles) {
      uploadPromises.push(directUploadFile(file))
    }

    try {
      await Promise.all(uploadPromises)
      if (loadUnattachedFiles) await loadUnattachedFiles()
    } catch (error) {
    }

    event.target.value = ''
  }

  return {
    directUploadFile,
    uploadFileRaw,
    finalizeUploads,
    handleSheetSelection,
    handleFileUpload
  }
}
