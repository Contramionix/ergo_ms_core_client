import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

export function useFileActions(uploadedFiles, selectedFile, fileToReplace, loadUserFiles, connectionId, isSheetPickerVisible, currentUploadFile, availableSheets, isReplacing) {
  
  async function deleteFile(file) {
    const confirmed = confirm(`Вы уверены, что хотите удалить файл "${file.name}"?`)
    if (!confirmed) return

    try {
      const res = await apiClient.delete(endpoints.bi.uploadDelete(file.id))

      if (res.status === 204 || res.success) {
        const index = uploadedFiles.value.findIndex(f => f.id === file.id)
        if (index !== -1) {
          uploadedFiles.value.splice(index, 1)
        }

        if (selectedFile.value?.id === file.id) {
          selectedFile.value = null
        }

        console.log('[deleteFile] удалён успешно')
      } else {
        console.warn('[deleteFile] ошибка удаления:', res)
        alert('Не удалось удалить файл')
      }
    } catch (error) {
      console.error('[deleteFile] ошибка при запросе:', error)
      alert('Ошибка при удалении файла')
    }
  }

  async function handleFileReplace(event, MAX_SIZE_MB = 200) {
    const file = event.target.files[0]
    if (!file || !fileToReplace.value) return

    if (file.size === 0) {
      alert('Файл пустой. Пожалуйста, выберите непустой файл.')
      return
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Файл превышает ${MAX_SIZE_MB} МБ`)
      return
    }

    // Включаем анимацию загрузки
    if (isReplacing) {
      isReplacing.value = true
    }

    try {
      // Проверяем, является ли файл xlsx многостраничным
      if (file.name.endsWith('.xlsx')) {
        const formData = new FormData()
        formData.append('file', file)
        const sheetRes = await apiClient.upload(endpoints.bi.xlsxSheets, formData)

        console.log('[handleFileReplace] Ответ API для листов:', sheetRes)
        
        if (sheetRes.success && sheetRes.data.sheets.length > 1) {
          console.log('[handleFileReplace] Найдено листов:', sheetRes.data.sheets.length, sheetRes.data.sheets)
          // Если файл многостраничный, показываем диалог выбора листов
          const tempFile = {
            name: file.name,
            originalFile: file,
            pendingSheets: sheetRes.data.sheets,
            replaceFileId: fileToReplace.value.id // Сохраняем ID файла для замены
          }
          currentUploadFile.value = tempFile
          availableSheets.value = sheetRes.data.sheets
          isSheetPickerVisible.value = true
          
          // Выключаем анимацию загрузки для диалога выбора листов
          if (isReplacing) {
            isReplacing.value = false
          }
          
          event.target.value = ''
          return
      } else if (sheetRes.success && sheetRes.data.sheets.length === 1) {
        console.log('[handleFileReplace] Найден один лист:', sheetRes.data.sheets[0])
        // Если лист один, используем его для замены
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        formData.append('sheet', sheetRes.data.sheets[0])
        
        console.log('[handleFileReplace] Заменяем с единственным листом:', sheetRes.data.sheets[0])
        
        const res = await apiClient.put(
          endpoints.bi.uploadDelete(fileToReplace.value.id),
          formData
        )

        if (res.success) {
          console.log('[handleFileReplace] Файл заменён с листом:', res.data)
          await loadUserFiles(connectionId)
          
          // Обновляем выбранный файл для немедленного отображения изменений
          if (selectedFile.value && selectedFile.value.id === fileToReplace.value.id) {
            selectedFile.value = { ...res.data }
          }
        } else {
          console.error('[handleFileReplace] Ошибка замены файла с листом:', res.errors)
          alert('Не удалось заменить файл')
        }

        // Выключаем анимацию загрузки
        if (isReplacing) {
          isReplacing.value = false
        }

        event.target.value = ''
        fileToReplace.value = null
        return
        }
      }

      // Обычная замена файла без выбора листов
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      
      // Если это xlsx файл, добавляем лист по умолчанию
      if (file.name.endsWith('.xlsx')) {
        formData.append('sheet', 'Sheet1') // или первый лист
        console.log('[handleFileReplace] Добавлен параметр sheet для xlsx файла: Sheet1')
      }

      console.log('[handleFileReplace] FormData содержимое:')
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value)
      }

      const res = await apiClient.put(
        endpoints.bi.uploadDelete(fileToReplace.value.id),
        formData
      )

      if (res.success) {
        console.log('[handleFileReplace] Файл заменён:', res.data)
        await loadUserFiles(connectionId)
        
        // Обновляем выбранный файл для немедленного отображения изменений
        if (selectedFile.value && selectedFile.value.id === fileToReplace.value.id) {
          selectedFile.value = { ...res.data }
        }
      } else {
        console.error('[handleFileReplace] Ошибка замены файла:', res.errors)
        alert('Не удалось заменить файл')
      }
    } catch (error) {
      console.error('[handleFileReplace] Ошибка при замене файла:', error)
      alert('Произошла ошибка при замене файла')
    }

    // Выключаем анимацию загрузки
    if (isReplacing) {
      isReplacing.value = false
    }

    event.target.value = ''
    fileToReplace.value = null
  }

  async function handleFileReplaceWithSheets(sheets) {
    isSheetPickerVisible.value = false
    const file = currentUploadFile.value
    if (!file || !sheets.length || !file.replaceFileId) return

    // Включаем анимацию загрузки
    if (isReplacing) {
      isReplacing.value = true
    }

    try {
      // При замене файла используем только первый выбранный лист
      const sheet = sheets[0]
      console.log('[handleFileReplaceWithSheets] Заменяем файл с листом:', sheet)
      console.log('[handleFileReplaceWithSheets] Файл для замены:', file.originalFile?.name)
      console.log('[handleFileReplaceWithSheets] ID файла для замены:', file.replaceFileId)
      
      const formData = new FormData()
      formData.append('file', file.originalFile)
      formData.append('sheet', sheet)
      
      // Оставляем оригинальное имя файла без изменений
      formData.append('name', file.name)

      // Логируем содержимое FormData
      console.log('[handleFileReplaceWithSheets] FormData содержимое:')
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value)
      }

      const res = await apiClient.put(
        endpoints.bi.uploadDelete(file.replaceFileId),
        formData
      )

      if (res.success) {
        console.log('[handleFileReplaceWithSheets] Файл заменён успешно:', res.data)
        await loadUserFiles(connectionId)
        
        // Обновляем выбранный файл для немедленного отображения изменений
        if (selectedFile.value && selectedFile.value.id === file.replaceFileId) {
          selectedFile.value = { ...res.data }
        }
      } else {
        console.error('[handleFileReplaceWithSheets] Ошибка замены файла:', res.errors)
        alert(`Не удалось заменить файл листом "${sheet}"`)
      }
    } catch (error) {
      console.error('[handleFileReplaceWithSheets] Ошибка:', error)
      alert('Ошибка при замене файла')
    }

    // Выключаем анимацию загрузки
    if (isReplacing) {
      isReplacing.value = false
    }

    currentUploadFile.value = null
    fileToReplace.value = null
  }

  async function renameFile(file) {
    const originalExt = file.name.split('.').pop()
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')

    const newNameInput = prompt('Новое имя файла:', nameWithoutExt)
    if (!newNameInput || newNameInput.trim() === '') return

    const newName = `${newNameInput.trim()}.${originalExt}`

    const res = await apiClient.patch(endpoints.bi.uploadDelete(file.id), {
      name: newName
    })

    if (res.success) {
      await loadUserFiles(connectionId)
    } else {
      alert('Ошибка переименования')
      console.error('[renameFile] Ошибка:', res.errors)
    }
  }

  return {
    deleteFile,
    handleFileReplace,
    handleFileReplaceWithSheets,
    renameFile
  }
}
