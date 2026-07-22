import { ref } from 'vue'

import {
  ensureLayoutPluginForModule,
  layoutPluginsRef,
} from '@/js/layoutPlugins.js'
import { resolveModuleFromOffcanvasPage } from '@/integrations/layoutPluginRegistry.js'

export const isOffcanvasSidebarOpen = ref(false)
export const currentOffcanvasSidebarPage = ref('')

function ensureOffcanvasLayoutPlugin(page) {
  const moduleName = resolveModuleFromOffcanvasPage(page)
  if (!moduleName) {
    return
  }

  void ensureLayoutPluginForModule(moduleName).then((component) => {
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
