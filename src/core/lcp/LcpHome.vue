<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col-12">
        <div class="d-flex align-items-center justify-content-between">
          <div>
            <h1 class="h3 mb-1 d-flex align-items-center gap-2">
              <Blocks class="text-primary" />
              Low-Code Platform
            </h1>
            <p class="text-muted mb-0">
              Создавайте интерфейсы без написания кода
            </p>
          </div>
          <router-link to="/lcp/modules/create" class="btn btn-primary d-flex align-items-center gap-2">
            <Plus :size="18" />
            Создать модуль
          </router-link>
        </div>
      </div>
    </div>

    <!-- Статистика -->
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0 bg-primary bg-opacity-10 rounded-3 p-3">
                <FolderKanban class="text-primary" :size="24" />
              </div>
              <div class="flex-grow-1 ms-3">
                <h2 class="h4 mb-0">{{ stats.modules }}</h2>
                <p class="text-muted mb-0 small">Модулей</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0 bg-success bg-opacity-10 rounded-3 p-3">
                <FileText class="text-success" :size="24" />
              </div>
              <div class="flex-grow-1 ms-3">
                <h2 class="h4 mb-0">{{ stats.pages }}</h2>
                <p class="text-muted mb-0 small">Страниц</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0 bg-info bg-opacity-10 rounded-3 p-3">
                <Box class="text-info" :size="24" />
              </div>
              <div class="flex-grow-1 ms-3">
                <h2 class="h4 mb-0">{{ stats.components }}</h2>
                <p class="text-muted mb-0 small">Компонентов</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0 bg-warning bg-opacity-10 rounded-3 p-3">
                <Database class="text-warning" :size="24" />
              </div>
              <div class="flex-grow-1 ms-3">
                <h2 class="h4 mb-0">{{ stats.dataSources }}</h2>
                <p class="text-muted mb-0 small">Источников данных</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Последние модули -->
    <div class="row">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
            <h5 class="mb-0">Модули</h5>
            <router-link to="/lcp/modules" class="btn btn-sm btn-outline-primary">
              Все модули
            </router-link>
          </div>
          <div class="card-body p-0">
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
              </div>
            </div>
            
            <div v-else-if="modules.length === 0" class="text-center py-5">
              <FolderKanban class="text-muted mb-3" :size="48" />
              <p class="text-muted mb-3">Нет созданных модулей</p>
              <router-link to="/lcp/modules/create" class="btn btn-primary">
                Создать первый модуль
              </router-link>
            </div>
            
            <div v-else class="list-group list-group-flush">
              <router-link
                v-for="mod in modules"
                :key="mod.id"
                :to="`/lcp/editor/${mod.slug}`"
                class="list-group-item list-group-item-action d-flex align-items-center py-3"
              >
                <div class="flex-shrink-0 me-3">
                  <div 
                    class="rounded-3 p-2 d-flex align-items-center justify-content-center"
                    :class="`bg-${mod.color} bg-opacity-10`"
                  >
                    <component :is="getIcon(mod.icon)" :class="`text-${mod.color}`" :size="24" />
                  </div>
                </div>
                <div class="flex-grow-1">
                  <h6 class="mb-1">{{ mod.name }}</h6>
                  <p class="text-muted small mb-0">{{ mod.pages_count }} страниц</p>
                </div>
                <ChevronRight class="text-muted" :size="20" />
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as Icons from 'lucide-vue-next'
import { 
  Blocks, Plus, FolderKanban, FileText, Box, Database, ChevronRight 
} from 'lucide-vue-next'
import lcpApi from './js/api'

const loading = ref(true)
const modules = ref([])
const stats = ref({
  modules: 0,
  pages: 0,
  components: 0,
  dataSources: 0
})

const getIcon = (name) => Icons[name] || Icons.Box

async function loadData() {
  loading.value = true
  try {
    const [modulesRes, componentsRes] = await Promise.all([
      lcpApi.modules.list(),
      lcpApi.componentTemplates.list()
    ])
    
    modules.value = modulesRes.data?.results || modulesRes.data || []
    const components = componentsRes.data?.results || componentsRes.data || []
    
    stats.value.modules = modules.value.length
    stats.value.pages = modules.value.reduce((sum, m) => sum + (m.pages_count || 0), 0)
    stats.value.components = components.length
  } catch (e) {
    console.error('Ошибка загрузки:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>


