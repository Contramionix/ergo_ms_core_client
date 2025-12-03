<template>
  <div class="p-2">
    <div class="d-flex align-items-center justify-content-between mb-2">
      <small class="text-muted fw-semibold">Страницы</small>
      <button class="btn btn-sm btn-primary" @click="showCreateModal = true">
        <Plus :size="14" />
      </button>
    </div>

    <div v-if="loading" class="text-center py-3">
      <div class="spinner-border spinner-border-sm"></div>
    </div>

    <div v-else-if="pages.length === 0" class="text-center py-3 text-muted">
      <FileText :size="24" class="mb-2 opacity-50" />
      <p class="small mb-0">Нет страниц</p>
    </div>

    <div v-else class="list-group list-group-flush">
      <router-link
        v-for="page in pages"
        :key="page.id"
        :to="`/lcp/editor/${store.currentModule?.slug}/${page.slug}`"
        class="list-group-item list-group-item-action d-flex align-items-center py-2 px-2"
        :class="{ active: store.currentPage?.id === page.id }"
      >
        <component :is="getIcon(page.icon)" :size="16" class="me-2 flex-shrink-0" />
        <span class="flex-grow-1 small text-truncate">{{ page.name }}</span>
        <span v-if="page.is_homepage" class="badge bg-primary ms-1">Home</span>
        <span v-if="page.is_draft" class="badge bg-warning text-dark ms-1">Черновик</span>
      </router-link>
    </div>

    <!-- Модальное окно создания -->
    <div v-if="showCreateModal" class="modal d-block" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Создать страницу</h5>
            <button type="button" class="btn-close" @click="showCreateModal = false"></button>
          </div>
          <form @submit.prevent="createPage">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Название</label>
                <input v-model="newPage.name" type="text" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Slug</label>
                <input v-model="newPage.slug" type="text" class="form-control" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showCreateModal = false">
                Отмена
              </button>
              <button type="submit" class="btn btn-primary" :disabled="creating">
                {{ creating ? 'Создание...' : 'Создать' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as Icons from 'lucide-vue-next'
import { Plus, FileText } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useEditorStore } from '../store/editor'
import lcpApi from '../js/api'

const router = useRouter()
const toast = useToast()
const store = useEditorStore()

const pages = ref([])
const loading = ref(false)
const showCreateModal = ref(false)
const creating = ref(false)
const newPage = ref({ name: '', slug: '' })

const getIcon = (name) => Icons[name] || Icons.File

async function loadPages() {
  if (!store.currentModule) return
  
  loading.value = true
  try {
    const { data } = await lcpApi.modules.getPages(store.currentModule.slug)
    pages.value = data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function createPage() {
  if (!store.currentModule) return
  
  creating.value = true
  try {
    const { data } = await lcpApi.pages.create({
      ...newPage.value,
      module: store.currentModule.id
    })
    pages.value.push(data)
    showCreateModal.value = false
    newPage.value = { name: '', slug: '' }
    toast.success('Страница создана')
    router.push(`/lcp/editor/${store.currentModule.slug}/${data.slug}`)
  } catch (e) {
    toast.error('Ошибка создания страницы')
    console.error(e)
  } finally {
    creating.value = false
  }
}

// Авто-slug
watch(() => newPage.value.name, (name) => {
  newPage.value.slug = name
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
})

watch(() => store.currentModule, loadPages, { immediate: true })
</script>


