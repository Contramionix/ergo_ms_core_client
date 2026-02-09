import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

export function useRedirectIfFileConnection() {
  const router = useRouter()
  const route = useRoute()

  onMounted(async () => {
    const connectionId = route.params.id || route.params.pk
    if (!connectionId) return

    const res = await apiClient.get(`${endpoints.bi.ConnectionsList}${connectionId}/`)
    if (res.success) {
      const type = (res.data.connector_type_display || res.data.connector_type || '').toLowerCase().trim()
      
      // Более надежная проверка типа файлового подключения
      const isFileConnection = type === 'file' || 
                               type === 'files' || 
                               type === 'файл' || 
                               type === 'файлы' ||
                               type.includes('file') || 
                               type.includes('файл')

      if (isFileConnection) {
        router.replace(`/bi/connections/${connectionId}/files/`)
      }
    }
  })
}