import { apiClient }    from '@/js/api/manager'

export default {
  getColumns(datasetId) {
    return apiClient.get(`/bi_analysis/bi_datasets/${datasetId}/columns/`)
  },
  getParams(datasetId) {
    return apiClient.get(`/bi_analysis/bi_datasets/params/`, { params: { dataset: datasetId } })
  },
  updateParam(paramId, data) {
    return apiClient.patch(`/bi_analysis/bi_datasets/params/${paramId}/`, data)
  },
  getFieldValues(datasetId, fieldId, search) {
    let url = `/bi_analysis/bi_datasets/${datasetId}/field-values/${fieldId}/`
    if (search != null && String(search).trim() !== '') {
      url += `?search=${encodeURIComponent(String(search).trim())}`
    }
    return apiClient.get(url)
  },
  getRows(datasetId) {
    return apiClient.get(`/bi_analysis/bi_datasets/${datasetId}/rows/`)
  },
  getDatasetRows(datasetId) {
    return apiClient.get(`/bi_analysis/bi_datasets/${datasetId}/rows/`)
  },
  getChart(chartId) {
    return apiClient.get(`/bi_analysis/bi_charts/${chartId}/`)
  },
  getChartRows(chartId) {
    return apiClient.get(`/bi_analysis/bi_charts/${chartId}/rows/`)
  },
  getDataset(datasetId) {
    return apiClient.get(`/bi_analysis/bi_datasets/${datasetId}/`)
  },
  createChart(payload) {
    return apiClient.post('/bi_analysis/bi_charts/', { ...payload, params: payload.params ?? payload.settings });
  },
  updateChart(id, payload) {
    return apiClient.put(`/bi_analysis/bi_charts/${id}/`, { ...payload, params: payload.params ?? payload.settings });
  },
  getDatasetRowsAgg(datasetId, fields) {
    return apiClient.post(`/bi_analysis/bi_datasets/${datasetId}/rows-agg/`, { fields })
  }
}
