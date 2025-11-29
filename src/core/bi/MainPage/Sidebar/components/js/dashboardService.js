import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

const BASE = endpoints.bi.DashboardList // 'bi_analysis/bi_dashboards/'

export default {
  // ===== Dashboards CRUD =====
  listDashboards(params) {
    // GET /api/bi_analysis/bi_dashboards/?...
    return apiClient.get(BASE, params)
  },

  getDashboard(id) {
    // GET /api/bi_analysis/bi_dashboards/{id}/
    return apiClient.get(`${BASE}${id}/`)
  },

  createDashboard(payload) {
    // POST /api/bi_analysis/bi_dashboards/
    return apiClient.post(BASE, payload)
  },

  updateDashboard(id, payload) {
    // PUT /api/bi_analysis/bi_dashboards/{id}/
    return apiClient.put(`${BASE}${id}/`, payload)
  },

  patchDashboard(id, payload) {
    // PATCH /api/bi_analysis/bi_dashboards/{id}/
    return apiClient.patch(`${BASE}${id}/`, payload)
  },

  deleteDashboard(id) {
    // DELETE /api/bi_analysis/bi_dashboards/{id}/
    return apiClient.delete(`${BASE}${id}/`)
  }
}


