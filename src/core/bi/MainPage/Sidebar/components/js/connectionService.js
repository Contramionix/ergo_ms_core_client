import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

export default {
  /** GET /api/bi_analysis/bi_connections/<id>/ */
  get(id) {
    return apiClient.get(endpoints.bi.connectionDetail(id))
      .then(r => r.data);
  },
  getFiles(id) {
    return apiClient.get(endpoints.bi.connectionFiles(id))
  }
}