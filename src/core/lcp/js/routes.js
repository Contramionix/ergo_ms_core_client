export default {
  'lcp-home': {
    path: '/lcp',
    component: '@/core/lcp/LcpHome.vue',
    meta: { title: 'Low-Code Platform', requiresAuth: true }
  },
  'lcp-modules': {
    path: '/lcp/modules',
    component: '@/core/lcp/ModulesList.vue',
    meta: { title: 'Модули LCP', requiresAuth: true }
  },
  'lcp-module-create': {
    path: '/lcp/modules/create',
    component: '@/core/lcp/ModuleCreate.vue',
    meta: { title: 'Создать модуль', requiresAuth: true }
  },
  'lcp-editor-module': {
    path: '/lcp/editor/:moduleSlug',
    component: '@/core/lcp/editor/EditorLayout.vue',
    meta: { title: 'Редактор модуля', requiresAuth: true }
  },
  'lcp-editor-page': {
    path: '/lcp/editor/:moduleSlug/:pageSlug',
    component: '@/core/lcp/editor/EditorLayout.vue',
    meta: { title: 'Редактор страницы', requiresAuth: true }
  },
  'lcp-view-module': {
    path: '/lcp/view/:moduleSlug',
    component: '@/core/lcp/runtime/RuntimeView.vue',
    meta: { title: 'Просмотр модуля', requiresAuth: true }
  },
  'lcp-view-page': {
    path: '/lcp/view/:moduleSlug/:pageSlug',
    component: '@/core/lcp/runtime/RuntimeView.vue',
    meta: { title: 'Просмотр страницы', requiresAuth: true }
  },
}

