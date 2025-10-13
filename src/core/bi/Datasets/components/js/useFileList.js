import { ref } from 'vue'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { useRoute } from 'vue-router'

export function useFileList(tempUploadedFiles, selectedFile, uploadedFiles, currentUploadFile, availableSheets, sheetBeingEdited, isSheetPickerVisible, connectionIdRef) {

  const route = useRoute()
  const connectionId = connectionIdRef || ref(null)

  if (!connectionIdRef && route.params.connectionId) {
    connectionId.value = Number(route.params.connectionId)
  }

  if (connectionIdRef && connectionIdRef.value) {
    connectionId.value = connectionIdRef.value
  }

  function removeTempFile(file) {

    const index = tempUploadedFiles.value.findIndex(f => f.temp_path === file.temp_path)
    if (index !== -1) {
      tempUploadedFiles.value.splice(index, 1)

      if (selectedFile.value?.temp_path === file.temp_path) {
        selectedFile.value = null
      }

    }
  }

  function openSheetPicker(file) {
    currentUploadFile.value = file
    availableSheets.value = file.pendingSheets
    sheetBeingEdited.value = getSheetNameFromFile(file.name)
    isSheetPickerVisible.value = true
  }

  function selectFile(file) {
    if (file.pendingSheets && !file.processedSheets) {
      openSheetPicker(file)
      return
    }
    selectedFile.value = file
  }

  async function loadUserFiles(connectionIdArg) {
    const id = connectionIdArg ?? connectionId.value
  
    if (!id) {
      return
    }

    const cleanId = typeof id === 'object' ? id.value || id : id
  
    try {
      const res = await apiClient.getUploadedFiles(endpoints.bi.connectionFiles(cleanId))
      if (res.success) {
        uploadedFiles.value = res.data
      } else {
        uploadedFiles.value = []
      }
    } catch (error) {
      uploadedFiles.value = []
    }
  }

  function getSheetNameFromFile(name) {
    const match = name.match(/–\s*(.+)\.xlsx$/)
    return match ? match[1] : null
  }

  return {
    connectionId,
    removeTempFile,
    openSheetPicker,
    selectFile,
    loadUserFiles,
    getSheetNameFromFile
  }
}
