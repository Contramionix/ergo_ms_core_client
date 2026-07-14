import { ref } from 'vue'

import {
  ensureLayoutPluginForModule,
  layoutPluginsRef,
} from '@/js/layoutPlugins.js'

const BI_OFFCANVAS_PAGES = new Set(['datasets', 'connections', 'charts', 'dashboards'])

export const isOffcanvasSidebarOpen = ref(false)
export const currentOffcanvasSidebarPage = ref('')

function ensureOffcanvasLayoutPlugin(page) {
  if (!BI_OFFCANVAS_PAGES.has(page)) {
    return
  }

  void ensureLayoutPluginForModule('bi_analysis').then((component) => {
    if (!component || layoutPluginsRef.value.includes(component)) {
      return
    }
    layoutPluginsRef.value = [...layoutPluginsRef.value, component]
  })
}

export function openOffcanvasSidebar(page) {
  currentOffcanvasSidebarPage.value = page
  isOffcanvasSidebarOpen.value = true
  ensureOffcanvasLayoutPlugin(page)
}

export function closeOffcanvasSidebar() {
  isOffcanvasSidebarOpen.value = false
  currentOffcanvasSidebarPage.value = ''
}
