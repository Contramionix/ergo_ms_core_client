import { ref } from 'vue'

export const isOffcanvasSidebarOpen = ref(false)
export const currentOffcanvasSidebarPage = ref('')

export function openOffcanvasSidebar(page) {
  currentOffcanvasSidebarPage.value = page
  isOffcanvasSidebarOpen.value = true
}

export function closeOffcanvasSidebar() {
  isOffcanvasSidebarOpen.value = false
  currentOffcanvasSidebarPage.value = ''
}
