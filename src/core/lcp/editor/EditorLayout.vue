<template>
  <div class="lcp-editor">
    <!-- Header -->
    <header class="lcp-editor__header">
      <div class="lcp-editor__header-left">
        <router-link to="/lcp" class="btn btn-sm btn-light d-flex align-items-center gap-1">
          <ArrowLeft :size="16" />
        </router-link>
        <div v-if="store.currentModule">
          <div class="d-flex align-items-center gap-2">
            <h6 class="mb-0">{{ store.currentModule.name }}</h6>
            <button
              v-if="store.currentPage"
              class="btn btn-sm d-flex align-items-center gap-1 lcp-homepage-btn"
              :class="store.currentPage.is_homepage ? 'btn-primary' : 'btn-outline-primary'"
              :disabled="store.isSaving"
              @click="toggleHomepage"
              :title="store.currentPage.is_homepage ? 'Снять с главной' : 'Установить как главную'"
            >
              <Home :size="14" />
              <span v-if="store.currentPage.is_homepage">Главная</span>
            </button>
          </div>
          <small class="text-muted">{{ store.currentPage?.name || 'Выберите страницу' }}</small>
        </div>
      </div>

      <div class="lcp-editor__header-center">
        <div class="btn-group btn-group-sm">
          <button 
            class="btn btn-outline-secondary" 
            :disabled="!store.canUndo"
            @click="store.undo()"
            title="Отменить (Ctrl+Z)"
          >
            <Undo :size="16" />
          </button>
          <button 
            class="btn btn-outline-secondary" 
            :disabled="!store.canRedo"
            @click="store.redo()"
            title="Повторить (Ctrl+Y)"
          >
            <Redo :size="16" />
          </button>
        </div>

        <div class="btn-group btn-group-sm ms-2">
          <button 
            class="btn"
            :class="viewMode === 'edit' ? 'btn-primary' : 'btn-outline-secondary'"
            @click="viewMode = 'edit'"
          >
            <Edit :size="16" />
          </button>
          <button 
            class="btn"
            :class="viewMode === 'preview' ? 'btn-primary' : 'btn-outline-secondary'"
            @click="viewMode = 'preview'"
          >
            <Eye :size="16" />
          </button>
        </div>

        <select v-model="breakpoint" class="form-select form-select-sm ms-2" style="width: auto;">
          <option value="desktop">
            <Monitor :size="14" /> Desktop
          </option>
          <option value="tablet">Tablet</option>
          <option value="mobile">Mobile</option>
        </select>
      </div>

      <div class="lcp-editor__header-right">
        <span v-if="store.hasUnsavedChanges" class="badge bg-warning text-dark me-2">
          Несохранённые изменения
        </span>
        <div class="btn-group btn-group-sm">
          <button 
            class="btn btn-outline-secondary d-flex align-items-center gap-1"
            :disabled="store.isSaving || !store.hasUnsavedChanges"
            @click="saveDraft"
            title="Сохранить как черновик"
          >
            <Save :size="16" />
            {{ store.isSaving && savingAsDraft ? 'Сохранение...' : 'Черновик' }}
          </button>
          <button 
            class="btn btn-success d-flex align-items-center gap-1"
            :disabled="store.isSaving || !store.hasUnsavedChanges"
            @click="publish"
            title="Опубликовать страницу"
          >
            <Save :size="16" />
            {{ store.isSaving && !savingAsDraft ? 'Публикация...' : 'Опубликовать' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Body -->
    <div class="lcp-editor__body">
      <!-- Левая панель: компоненты и дерево -->
      <aside class="lcp-editor__sidebar lcp-editor__sidebar--left">
        <div class="nav nav-tabs nav-fill border-bottom">
          <button 
            class="nav-link"
            :class="{ active: leftTab === 'components' }"
            @click="leftTab = 'components'"
          >
            <Puzzle :size="16" class="me-1" />
            Компоненты
          </button>
          <button 
            class="nav-link"
            :class="{ active: leftTab === 'tree' }"
            @click="leftTab = 'tree'"
          >
            <ListTree :size="16" class="me-1" />
            Дерево
          </button>
          <button 
            class="nav-link"
            :class="{ active: leftTab === 'pages' }"
            @click="leftTab = 'pages'"
          >
            <FileText :size="16" class="me-1" />
            Страницы
          </button>
        </div>

        <ComponentPalette v-if="leftTab === 'components'" />
        <ComponentTree v-else-if="leftTab === 'tree'" />
        <PagesList v-else-if="leftTab === 'pages'" />
      </aside>

      <!-- Холст -->
      <main 
        class="lcp-editor__canvas"
        :class="`lcp-editor__canvas--${breakpoint}`"
      >
        <EditorCanvas v-if="viewMode === 'edit'" :breakpoint="breakpoint" />
        <PreviewCanvas v-else :breakpoint="breakpoint" />
      </main>

      <!-- Правая панель: свойства -->
      <aside class="lcp-editor__sidebar lcp-editor__sidebar--right">
        <PropertiesPanel />
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { 
  ArrowLeft, Undo, Redo, Edit, Eye, Monitor, Save, 
  Puzzle, ListTree, FileText, Home
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useEditorStore } from '../store/editor'
import ComponentPalette from './ComponentPalette.vue'
import ComponentTree from './ComponentTree.vue'
import PagesList from './PagesList.vue'
import EditorCanvas from './EditorCanvas.vue'
import PreviewCanvas from './PreviewCanvas.vue'
import PropertiesPanel from './PropertiesPanel.vue'
import '../styles/editor.scss'

const route = useRoute()
const toast = useToast()
const store = useEditorStore()

const viewMode = ref('edit')
const breakpoint = ref('desktop')
const leftTab = ref('components')
const savingAsDraft = ref(false)

// Загрузка данных
async function loadData() {
  const moduleSlug = route.params.moduleSlug
  const pageSlug = route.params.pageSlug
  
  if (!moduleSlug) return
  
  try {
    await store.loadModule(moduleSlug)
    await store.loadPalette(store.currentModule?.id)
    
    if (pageSlug) {
      await store.loadPage(moduleSlug, pageSlug)
    }
  } catch (e) {
    toast.error('Ошибка загрузки')
    console.error(e)
  }
}

// Сохранение как черновик
async function saveDraft() {
  savingAsDraft.value = true
  try {
    await store.savePage(true)
    toast.success('Сохранено как черновик!')
  } catch (e) {
    toast.error('Ошибка сохранения')
    console.error(e)
  } finally {
    savingAsDraft.value = false
  }
}

// Публикация
async function publish() {
  savingAsDraft.value = false
  try {
    await store.savePage(false)
    toast.success('Страница опубликована!')
  } catch (e) {
    toast.error('Ошибка публикации')
    console.error(e)
  }
}

// Переключение главной страницы
async function toggleHomepage() {
  if (!store.currentPage) return
  
  const newValue = !store.currentPage.is_homepage
  try {
    await store.setAsHomepage(newValue)
    if (newValue) {
      toast.success('Страница установлена как главная!')
    } else {
      toast.success('Страница снята с главной!')
    }
  } catch (e) {
    toast.error('Ошибка установки главной страницы')
    console.error(e)
  }
}

// Горячие клавиши
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (e.shiftKey) {
      publish()  // Ctrl+Shift+S - опубликовать
    } else {
      saveDraft()  // Ctrl+S - сохранить как черновик
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    if (e.shiftKey) {
      store.redo()
    } else {
      store.undo()
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault()
    store.redo()
  }
  if (e.key === 'Delete' && store.selectedComponentId) {
    store.removeComponent(store.selectedComponentId)
  }
}

// Предупреждение о несохранённых изменениях
function handleBeforeUnload(e) {
  if (store.hasUnsavedChanges) {
    e.preventDefault()
    e.returnValue = ''
  }
}

watch(() => route.params, loadData, { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  store.reset()
})
</script>

