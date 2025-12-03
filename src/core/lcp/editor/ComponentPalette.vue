<template>
  <div class="lcp-palette">
    <!-- Поиск -->
    <div class="lcp-palette__search">
      <div class="input-group input-group-sm">
        <span class="input-group-text">
          <Search :size="14" />
        </span>
        <input 
          v-model="searchQuery" 
          type="text" 
          class="form-control" 
          placeholder="Поиск компонентов..."
        >
      </div>
    </div>

    <!-- Категории -->
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border spinner-border-sm text-primary"></div>
    </div>

    <div v-else-if="filteredPalette.length === 0" class="text-center py-4 text-muted">
      <Package :size="32" class="mb-2 opacity-50" />
      <p class="small mb-0">Компоненты не найдены</p>
    </div>

    <div v-else>
      <div 
        v-for="group in filteredPalette" 
        :key="group.category.id" 
        class="lcp-palette__category"
      >
        <div 
          class="lcp-palette__category-header"
          @click="toggleCategory(group.category.id)"
        >
          <span class="d-flex align-items-center gap-2">
            <component :is="getIcon(group.category.icon)" :size="16" />
            {{ group.category.name }}
          </span>
          <ChevronDown 
            :size="16" 
            :class="{ 'rotate-180': openCategories.has(group.category.id) }"
            style="transition: transform 0.2s"
          />
        </div>

        <Transition name="collapse">
          <div v-if="openCategories.has(group.category.id)" class="lcp-palette__category-items">
            <div
              v-for="comp in group.components"
              :key="comp.id"
              class="lcp-palette__item"
              draggable="true"
              @dragstart="onDragStart($event, comp)"
              @click="addComponent(comp)"
              :title="comp.description || comp.name"
            >
              <component :is="getIcon(comp.icon)" class="lcp-palette__item-icon" />
              <span class="lcp-palette__item-name">{{ comp.name }}</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import * as Icons from 'lucide-vue-next'
import { Search, Package, ChevronDown } from 'lucide-vue-next'
import { useEditorStore } from '../store/editor'

const store = useEditorStore()

const searchQuery = ref('')
const openCategories = ref(new Set())
const loading = ref(false)

const getIcon = (name) => Icons[name] || Icons.Box

const filteredPalette = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  
  if (!query) return store.palette
  
  return store.palette
    .map(group => ({
      ...group,
      components: group.components.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.component_type.toLowerCase().includes(query)
      )
    }))
    .filter(group => group.components.length > 0)
})

function toggleCategory(id) {
  if (openCategories.value.has(id)) {
    openCategories.value.delete(id)
  } else {
    openCategories.value.add(id)
  }
}

function onDragStart(event, component) {
  event.dataTransfer.setData('application/json', JSON.stringify(component))
  event.dataTransfer.effectAllowed = 'copy'
}

function addComponent(component) {
  store.addComponent(component)
}

async function loadPaletteData() {
  if (!store.currentModule?.id) {
    return
  }
  
  loading.value = true
  try {
    await store.loadPalette(store.currentModule.id)
    // Открыть первую категорию по умолчанию
    if (store.palette.length > 0) {
      openCategories.value.add(store.palette[0].category.id)
    }
  } catch (e) {
    console.error('Ошибка загрузки палитры:', e)
  } finally {
    loading.value = false
  }
}

// Загружаем при монтировании, если модуль уже загружен
onMounted(() => {
  loadPaletteData()
})

// Следим за изменением модуля
watch(() => store.currentModule?.id, () => {
  loadPaletteData()
})
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>

