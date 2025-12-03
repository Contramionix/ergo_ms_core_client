<template>
  <div class="container-fluid py-4">
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h1 class="h3 mb-0 d-flex align-items-center gap-2">
        <FolderKanban class="text-primary" />
        Модули
      </h1>
      <router-link to="/lcp/modules/create" class="btn btn-primary d-flex align-items-center gap-2">
        <Plus :size="18" />
        Создать модуль
      </router-link>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>

    <div v-else-if="modules.length === 0" class="text-center py-5">
      <FolderKanban class="text-muted mb-3" :size="64" />
      <h4 class="text-muted">Нет модулей</h4>
      <p class="text-muted mb-4">Создайте первый модуль для начала работы</p>
      <router-link to="/lcp/modules/create" class="btn btn-primary btn-lg">
        <Plus class="me-2" :size="20" />
        Создать модуль
      </router-link>
    </div>

    <div v-else class="row g-4">
      <div v-for="mod in modules" :key="mod.id" class="col-md-6 col-lg-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex align-items-start mb-3">
              <div 
                class="rounded-3 p-3 me-3"
                :class="`bg-${mod.color} bg-opacity-10`"
              >
                <component :is="getIcon(mod.icon)" :class="`text-${mod.color}`" :size="28" />
              </div>
              <div class="flex-grow-1">
                <h5 class="mb-1">{{ mod.name }}</h5>
                <span 
                  class="badge"
                  :class="mod.is_active ? 'bg-success' : 'bg-secondary'"
                >
                  {{ mod.is_active ? 'Активен' : 'Неактивен' }}
                </span>
              </div>
              <div class="dropdown">
                <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">
                  <MoreVertical :size="16" />
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li>
                    <router-link :to="`/lcp/editor/${mod.slug}`" class="dropdown-item">
                      <Edit :size="16" class="me-2" />
                      Редактировать
                    </router-link>
                  </li>
                  <li>
                    <router-link :to="`/lcp/view/${mod.slug}`" class="dropdown-item">
                      <Eye :size="16" class="me-2" />
                      Просмотр
                    </router-link>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <button class="dropdown-item text-danger" @click="confirmDelete(mod)">
                      <Trash2 :size="16" class="me-2" />
                      Удалить
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            
            <p v-if="mod.description" class="text-muted small mb-3">
              {{ mod.description }}
            </p>
            
            <div class="d-flex align-items-center gap-3 text-muted small">
              <span class="d-flex align-items-center gap-1">
                <FileText :size="14" />
                {{ mod.pages_count }} страниц
              </span>
            </div>
          </div>
          <div class="card-footer bg-transparent border-top-0 pt-0">
            <div class="d-flex gap-2">
              <router-link 
                :to="`/lcp/editor/${mod.slug}`" 
                class="btn btn-primary flex-grow-1"
              >
                <Edit :size="16" class="me-1" />
                Редактор
              </router-link>
              <router-link 
                :to="`/lcp/view/${mod.slug}`" 
                class="btn btn-outline-secondary"
              >
                <Eye :size="16" />
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно удаления -->
    <ConfirmDialog
      :show="showDeleteDialog"
      title="Удалить модуль?"
      :message="`Вы уверены, что хотите удалить модуль &laquo;${moduleToDelete?.name}&raquo;? Все страницы модуля будут удалены.`"
      confirmText="Удалить"
      variant="danger"
      @confirm="deleteModule"
      @close="showDeleteDialog = false"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as Icons from 'lucide-vue-next'
import { 
  FolderKanban, Plus, MoreVertical, Edit, Eye, Trash2, FileText 
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import lcpApi from './js/api'

const toast = useToast()
const loading = ref(true)
const modules = ref([])
const showDeleteDialog = ref(false)
const moduleToDelete = ref(null)

const getIcon = (name) => Icons[name] || Icons.Box

async function loadModules() {
  loading.value = true
  try {
    const { data } = await lcpApi.modules.list()
    modules.value = data?.results || data || []
  } catch (e) {
    toast.error('Ошибка загрузки модулей')
    console.error(e)
  } finally {
    loading.value = false
  }
}

function confirmDelete(mod) {
  moduleToDelete.value = mod
  showDeleteDialog.value = true
}

async function deleteModule() {
  if (!moduleToDelete.value) return
  
  const slugToDelete = moduleToDelete.value.slug
  const idToDelete = moduleToDelete.value.id
  
  showDeleteDialog.value = false
  
  try {
    await lcpApi.modules.delete(slugToDelete)
    // Перезагружаем список модулей для актуальности данных
    await loadModules()
    toast.success('Модуль удалён')
  } catch (e) {
    const errorMessage = e?.response?.data?.detail || e?.message || 'Ошибка удаления модуля'
    toast.error(errorMessage)
    console.error('Ошибка удаления модуля:', e)
  } finally {
    moduleToDelete.value = null
  }
}

onMounted(loadModules)
</script>


