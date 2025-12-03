import { apiClient } from '@/js/api/manager'

const BASE_URL = 'lcp'

export const lcpApi = {
  // Модули
  modules: {
    list: () => apiClient.get(`${BASE_URL}/modules/`),
    get: (slug) => apiClient.get(`${BASE_URL}/modules/${slug}/`),
    create: (data) => apiClient.post(`${BASE_URL}/modules/`, data),
    update: (slug, data) => apiClient.patch(`${BASE_URL}/modules/${slug}/`, data),
    delete: (slug) => apiClient.delete(`${BASE_URL}/modules/${slug}/`),
    getFull: (slug) => apiClient.get(`${BASE_URL}/modules/${slug}/full/`),
    getPages: (slug) => apiClient.get(`${BASE_URL}/modules/${slug}/pages/`),
  },

  // Страницы
  pages: {
    list: (params) => apiClient.get(`${BASE_URL}/pages/`, params),
    get: (id) => apiClient.get(`${BASE_URL}/pages/${id}/`),
    getByPath: (module, page) => apiClient.get(`${BASE_URL}/pages/by-path/`, { module, page }),
    create: (data) => apiClient.post(`${BASE_URL}/pages/`, data),
    update: (id, data) => apiClient.patch(`${BASE_URL}/pages/${id}/`, data),
    delete: (id) => apiClient.delete(`${BASE_URL}/pages/${id}/`),
    duplicate: (id) => apiClient.post(`${BASE_URL}/pages/${id}/duplicate/`),
    makeTemplate: (id) => apiClient.post(`${BASE_URL}/pages/${id}/make_template/`),
  },

  // Категории компонентов
  componentCategories: {
    list: () => apiClient.get(`${BASE_URL}/component-categories/`),
    get: (slug) => apiClient.get(`${BASE_URL}/component-categories/${slug}/`),
    create: (data) => apiClient.post(`${BASE_URL}/component-categories/`, data),
    update: (slug, data) => apiClient.patch(`${BASE_URL}/component-categories/${slug}/`, data),
    delete: (slug) => apiClient.delete(`${BASE_URL}/component-categories/${slug}/`),
  },

  // Шаблоны компонентов
  componentTemplates: {
    list: (params) => apiClient.get(`${BASE_URL}/component-templates/`, params),
    get: (id) => apiClient.get(`${BASE_URL}/component-templates/${id}/`),
    create: (data) => apiClient.post(`${BASE_URL}/component-templates/`, data),
    update: (id, data) => apiClient.patch(`${BASE_URL}/component-templates/${id}/`, data),
    delete: (id) => apiClient.delete(`${BASE_URL}/component-templates/${id}/`),
    getPalette: (moduleId) => apiClient.get(`${BASE_URL}/component-templates/palette/`, { module: moduleId }),
  },

  // Источники данных
  dataSources: {
    list: (params) => apiClient.get(`${BASE_URL}/data-sources/`, params),
    get: (id) => apiClient.get(`${BASE_URL}/data-sources/${id}/`),
    create: (data) => apiClient.post(`${BASE_URL}/data-sources/`, data),
    update: (id, data) => apiClient.patch(`${BASE_URL}/data-sources/${id}/`, data),
    delete: (id) => apiClient.delete(`${BASE_URL}/data-sources/${id}/`),
    execute: (id, params) => apiClient.post(`${BASE_URL}/data-sources/${id}/execute/`, { params }),
  },

  // Таблицы БД
  databaseTables: {
    list: (params) => apiClient.get(`${BASE_URL}/database-tables/`, params),
    get: (id) => apiClient.get(`${BASE_URL}/database-tables/${id}/`),
    create: (data) => apiClient.post(`${BASE_URL}/database-tables/`, data),
    update: (id, data) => apiClient.patch(`${BASE_URL}/database-tables/${id}/`, data),
    delete: (id) => apiClient.delete(`${BASE_URL}/database-tables/${id}/`),
    generateMigration: (id) => apiClient.post(`${BASE_URL}/database-tables/${id}/generate_migration/`),
  },

  // Действия
  actions: {
    list: (params) => apiClient.get(`${BASE_URL}/actions/`, params),
    get: (id) => apiClient.get(`${BASE_URL}/actions/${id}/`),
    create: (data) => apiClient.post(`${BASE_URL}/actions/`, data),
    update: (id, data) => apiClient.patch(`${BASE_URL}/actions/${id}/`, data),
    delete: (id) => apiClient.delete(`${BASE_URL}/actions/${id}/`),
  },

  // Переменные
  variables: {
    list: (params) => apiClient.get(`${BASE_URL}/variables/`, params),
    get: (id) => apiClient.get(`${BASE_URL}/variables/${id}/`),
    create: (data) => apiClient.post(`${BASE_URL}/variables/`, data),
    update: (id, data) => apiClient.patch(`${BASE_URL}/variables/${id}/`, data),
    delete: (id) => apiClient.delete(`${BASE_URL}/variables/${id}/`),
  },

  // Аудит
  audit: {
    list: (params) => apiClient.get(`${BASE_URL}/audit/`, params),
    get: (id) => apiClient.get(`${BASE_URL}/audit/${id}/`),
  },
}

export default lcpApi


