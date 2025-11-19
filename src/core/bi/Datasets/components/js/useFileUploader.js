import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

export function useFileUploader(tempUploadedFiles, selectedFile, isSheetPickerVisible, currentUploadFile, availableSheets, loadUserFiles, connectionId, uploadedFiles = null, selectFileCallback = null, isFinalizingRef = null) {

  const MAX_FILES = 10
  const MAX_SIZE_MB = 200

  const getConnectionId = () => {
    return connectionId && typeof connectionId === 'object' ? connectionId.value : connectionId
  }

async function uploadFile(file, sheet = null) {
  const formData = new FormData()
  formData.append('file', file)

  let name = file.name
  if (sheet) {
    const base = file.name.replace(/\.xlsx$/, '')
    name = `${base} – ${sheet}.xlsx`
    formData.append('sheet', sheet)
  }

  try {
    const res = await apiClient.upload(endpoints.bi.Upload, formData, true)

    if (res.success) {
      const temp = {
        name,
        temp_path: res.data.temp_path,
        original_filename: res.data.original_filename,
        file_type: res.data.file_type,
        originalFile: file,
        isReady: true,
        sheet: sheet
      }
      tempUploadedFiles.value.push(temp)
      // Выбираем последний загруженный файл только если нет выбранного
      if (!selectedFile.value) {
        selectedFile.value = temp
      }
    }
  } catch (error) {
    console.error('[uploadFile] Исключение при загрузке:', error)
    throw error
  }
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
    if (!file.temp_path) {
      return null
    }
    const formData = new FormData()
    formData.append('temp_path', file.temp_path)
    formData.append('name', file.name)
    formData.append('original_filename', file.original_filename)
    formData.append('file_type', file.file_type)
    formData.append('connection', connectionId)
    if (file.sheet) formData.append('sheet', file.sheet)

    const res = await uploadFileRaw(formData, file.name, file.originalFile)
    if (res && res.success && res.data && res.data.id) {
      return res.data
    }
    return null
  })

  const uploaded = await Promise.all(finalizePromises)
  tempUploadedFiles.value = []
  return uploaded.filter(Boolean)
}

async function autoFinalizeAndSelect() {
  const currentConnectionId = getConnectionId()
  if (!currentConnectionId || tempUploadedFiles.value.length === 0) {
    return
  }

  // Показываем индикатор загрузки при финализации
  if (isFinalizingRef) {
    isFinalizingRef.value = true
  }

  try {
    // Сохраняем имена загруженных файлов для последующего поиска
    const uploadedFileNames = tempUploadedFiles.value.map(f => f.name)
    
    // Финализируем все загруженные файлы
    const finalizedFiles = await finalizeUploads(currentConnectionId)
    
    // Обновляем список файлов подключения
    await loadUserFiles(currentConnectionId)
    
    // Автоматически выбираем первый загруженный файл для просмотра
    if (finalizedFiles && finalizedFiles.length > 0 && uploadedFiles && selectFileCallback) {
      // Ждем немного, чтобы список файлов обновился
      setTimeout(() => {
        // Ищем первый загруженный файл в обновленном списке
        const firstFinalizedFile = finalizedFiles[0]
        if (firstFinalizedFile && firstFinalizedFile.id) {
          // Ищем файл по ID в списке uploadedFiles
          const foundFile = uploadedFiles.value.find(f => f.id === firstFinalizedFile.id)
          if (foundFile) {
            selectFileCallback(foundFile)
          } else {
            // Если не нашли по ID, ищем по имени
            const foundByName = uploadedFiles.value.find(f => 
              f.name === firstFinalizedFile.name || 
              uploadedFileNames.includes(f.name)
            )
            if (foundByName) {
              selectFileCallback(foundByName)
            }
          }
        }
      }, 200)
    }
  } catch (error) {
    console.error('[autoFinalizeAndSelect] Ошибка при финализации файлов:', error)
  } finally {
    // Скрываем индикатор загрузки
    if (isFinalizingRef) {
      isFinalizingRef.value = false
    }
  }
}

async function handleSheetSelection(sheets) {
  isSheetPickerVisible.value = false
  const file = currentUploadFile.value
  if (!file || !sheets.length) return

  // Загружаем все выбранные листы параллельно
  const uploadPromises = sheets.map(sheet => uploadFile(file.originalFile, sheet))
  
  try {
    await Promise.all(uploadPromises)
    
    // Если подключение уже существует, автоматически финализируем загруженные файлы
    await autoFinalizeAndSelect()
  } catch (error) {
    console.error('[handleSheetSelection] Ошибка при параллельной загрузке листов:', error)
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
          console.error(`[handleFileUpload] Ошибка проверки листов для ${file.name}:`, error)
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

    // Загружаем все файлы параллельно
    const uploadPromises = []

    // Загружаем xlsx файлы (с одним листом или без выбора)
    for (const { file, sheetRes } of xlsxChecks) {
      if (sheetRes?.success && sheetRes?.data?.sheets?.length === 1) {
        // Если лист один, загружаем сразу с этим листом
        uploadPromises.push(uploadFile(file, sheetRes.data.sheets[0]))
      } else {
        // Иначе загружаем без указания листа (будет использован первый)
        uploadPromises.push(uploadFile(file))
      }
    }

    // Загружаем остальные файлы
    for (const file of otherFiles) {
      uploadPromises.push(uploadFile(file))
    }

    // Ждем завершения всех загрузок параллельно
    try {
      await Promise.all(uploadPromises)
    } catch (error) {
      console.error('[handleFileUpload] Ошибка при параллельной загрузке:', error)
    }

    event.target.value = ''
    
    // Если подключение уже существует, автоматически финализируем загруженные файлы
    await autoFinalizeAndSelect()
  }

  return {
    uploadFile,
    uploadFileRaw,
    finalizeUploads,
    handleSheetSelection,
    handleFileUpload
  }
}
