import { ref } from 'vue'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

export function useDbTablesList() {
  const dbTables = ref([])
  const isDbLoading = ref(false)

  async function loadDbTables(connectionId) {
    if (!connectionId) return
    
    isDbLoading.value = true
    try {
      const res = await apiClient.get(endpoints.bi.connectionTables(connectionId))
      if (res.success) {
        dbTables.value = res.data
      }
    } catch (error) {
      console.error('[loadDbTables] Исключение при загрузке таблиц:', error)
    } finally {
      isDbLoading.value = false
    }
  }

  return {
    dbTables,
    isDbLoading,
    loadDbTables
  }
}