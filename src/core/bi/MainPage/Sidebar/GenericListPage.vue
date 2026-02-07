<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { apiClient } from '@/js/api/manager.js'
import { isDatasetSidebarOpen } from '@/core/bi/MainPage/Sidebar/components/js/useSidebarStore'
import { useRouter } from 'vue-router'
import SimpleTableDataSet from '@/core/bi/MainPage/Sidebar/components/SimpleTableDataSet.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'

const props = defineProps({
  config: {
    type: Object,
    required: true,
    validator: (config) => {
      return config.type && config.endpoint
    }
  },
  hideCreateButton: {
    type: Boolean,
    default: false
  }
})

const items = ref([])
const search = ref('')
const sort = ref('new')
const loading = ref(false)

const cols = [
  { key: 'name', label: 'Название' },
  { key: 'created_at', label: 'Дата', format: val => new Date(val).toLocaleDateString() },
  { key: 'actions', label: '' }
]

const router = useRouter()

function goToCreate() {
  if (!props.config.createRoute) {
    console.error('createRoute не определен в конфигурации')
    return
  }
  
  if (typeof props.config.createRoute === 'string') {
    router.push(props.config.createRoute)
  } else if (typeof props.config.createRoute === 'object' && props.config.createRoute.name) {
    router.push(props.config.createRoute)
  } else {
    console.error('Неправильная конфигурация createRoute:', props.config.createRoute)
  }
}

async function fetchItems() {
  loading.value = true
  try {
    const { data } = await apiClient.get(props.config.endpoint)
    const rows = Array.isArray(data) ? data : (data.results || [])
    
    if (props.config.mapData) {
      items.value = rows.map(props.config.mapData)
    } else {
      items.value = rows.map(item => ({
        id: item.id,
        name: item.name || '—',
        created_at: item.created_at,
        owner_username: item.owner_username,
        type: props.config.type,
        ...item
      }))
    }
  } catch (err) {
    console.error(`Ошибка загрузки ${props.config.type}:`, err)
  } finally {
    loading.value = false
  }
}

function handleDeleteRow(row) {
  const idx = items.value.findIndex(item => item.id === row.id)
  if (idx !== -1) items.value.splice(idx, 1)
}

watch(isDatasetSidebarOpen, (newVal) => {
  if (newVal && items.value.length === 0) {
    fetchItems()
  }
})

const transformedData = computed(() => {
  const term = search.value.toLowerCase()
  let list = [...items.value]

  if (term) {
    if (props.config.filterFunction) {
      list = list.filter(props.config.filterFunction(term))
    } else {
      list = list.filter(item =>
        item.name?.toLowerCase().includes(term) ||
        item.owner_username?.toLowerCase().includes(term)
      )
    }
  }

  switch (sort.value) {
    case 'new':
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      break
    case 'old':
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      break
    case 'az':
      list.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'za':
      list.sort((a, b) => b.name.localeCompare(a.name))
      break
  }

  return list
})

onMounted(fetchItems)
</script>

<template>
  <div class="fixed top-0 right-0 w-full sm:w-[540px] h-full bg-zinc-900 z-50 shadow-xl border-l border-zinc-700 flex flex-col" style="padding-left: 1rem; padding-right: 1rem; overflow-y: hidden;">
    <div class="space-y-4 flex-1 overflow-auto">
      <div class="flex gap-3" style="display: flex; flex-wrap: nowrap; margin-top: 1rem;">
        <input class="form-control" :placeholder="config.searchPlaceholder || 'Введите для поиска...'" style="width: 25rem;" v-model="search" />
        <select class="form-select" style="width: 11rem;" v-model="sort">
          <option value="new">Сначала новые</option>
          <option value="old">Сначала старые</option>
          <option value="az">А-Я</option>
          <option value="za">Я-А</option>
        </select>
        <button v-if="!hideCreateButton && config.createRoute && config.createButtonText" type="button" class="btn btn-primary" :style="{ width: config.createButtonWidth || '11rem' }"  @click="goToCreate">
          {{ config.createButtonText }}
        </button>
      </div>
      
      <div style="margin-top: 1rem;">
        <div v-if="loading" class="loader-center">
          <SpinnerLoading />
        </div>
        <SimpleTableDataSet v-else :cols="cols" :current-page="config.type" :users="transformedData" :isDatasetSidebarOpen="isDatasetSidebarOpen" @delete-row="handleDeleteRow"/>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.loader-center {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style> 