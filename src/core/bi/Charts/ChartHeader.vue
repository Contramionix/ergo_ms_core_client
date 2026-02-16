<template>
  <div class="body-header border-elements elements-color">
    <div class="header-label-icon">
      <span class="chart-type-icon-header" :style="chartTypeIconStyle">
        <component :is="chartTypeIconComponent" />
      </span>
      <div class="header-title-row">
        <div class="header-name-cell">
          <h4 class="header-label">{{ chartName }}</h4>
        </div>
        <div v-if="chartId && chartId !== 'new'" class="header-actions-cell">
          <button class="action-btn star" :class="{ active: isFavorite }" @click.stop="toggleFavorite" title="Избранное">
            <Star :size="18" />
          </button>
          <button ref="moreButtonRef" class="action-btn more" :class="{ 'menu-open': showMenu }" @click="onMoreClick" title="Ещё">
            <MoreHorizontal :size="18" />
          </button>
        </div>
      </div>
    </div>
    <div class="header-label-buttons">
      <button v-if="canRunAnalysis" class="btn text-white btn-sm btn-success" @click="emit('run-chart-analysis')" style="display: flex; gap: 5px; justify-content: center; align-items: center;">
        <BrainCircuit :size="18" />Интеллектуальный анализ
      </button>
      <button class="btn btn-sm fw-bold btn-full-screen" :class="{ active: isFullScreen }" style="display: flex; gap: 5px; justify-content: center; align-items: center;" @click="emit('toggle-full-screen')">
        <Maximize />На весь экран
      </button>
      <button class="btn btn-sm btn-primary" :disabled="isSaveDisabled" @click="emit('save-click')">
        {{ isEditMode ? 'Сохранить изменения' : 'Создать график' }}
      </button>
    </div>
  </div>

  <teleport to="body">
    <Transition name="dropdown-menu">
      <div v-if="showMenu" ref="menuDropdownRef" class="menu-dropdown" :style="menuPosition">
        <div class="menu-item" @click="onRename"><CaseSensitive :size="18" :stroke-width="2" />Переименовать</div>
        <div class="menu-item" @click="onCopyLink"><Link :size="18" :stroke-width="2" />Скопировать ссылку</div>
        <div class="menu-item danger" @click="onDelete"><Trash2 :size="18" :stroke-width="2" />Удалить</div>
      </div>
    </Transition>
  </teleport>
</template>

<script setup>
import { BrainCircuit, Maximize, Star, MoreHorizontal, CaseSensitive, Link, Trash2 } from 'lucide-vue-next'
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useToast } from 'vue-toastification'

const FAVORITES_STORAGE_KEY = 'favoriteCharts'

const props = defineProps({
  chartName: {
    type: String,
    default: '',
  },
  chartId: {
    type: [Number, String],
    default: null,
  },
  chartTypeIconComponent: {
    type: [Object, String, Function],
    required: true,
  },
  chartTypeIconStyle: {
    type: Object,
    default: () => ({}),
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
  datasetRows: {
    type: Array,
    default: () => [],
  },
  ollamaAvailable: {
    type: Boolean,
    default: false,
  },
  isFullScreen: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  chartRequiredFieldsFilled: {
    type: Boolean,
    default: false,
  },
  isChartDirty: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['run-chart-analysis', 'toggle-full-screen', 'save-click', 'rename', 'delete'])

const toast = useToast()
const favorites = ref(new Set())
const showMenu = ref(false)
const menuPosition = ref({ top: '0px', left: '0px' })
const menuDropdownRef = ref(null)
const moreButtonRef = ref(null)

const canRunAnalysis = computed(
  () =>
    props.isEditMode &&
    props.datasetRows &&
    props.datasetRows.length > 0 &&
    props.ollamaAvailable,
)

const isSaveDisabled = computed(
  () =>
    (props.isEditMode && props.loading) ||
    !props.chartRequiredFieldsFilled ||
    !props.isChartDirty,
)

const isFavorite = computed(() => {
  if (!props.chartId) return false
  return favorites.value.has(String(props.chartId))
})

function loadFavorites() {
  favorites.value.clear()
  const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      favorites.value = new Set(Array.isArray(parsed) ? parsed.map((x) => String(x)) : [])
    } catch {
      favorites.value = new Set()
    }
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites.value]))
}

function toggleFavorite() {
  if (!props.chartId) return
  const id = String(props.chartId)
  if (favorites.value.has(id)) {
    favorites.value.delete(id)
  } else {
    favorites.value.add(id)
  }
  saveFavorites()
}

function onMoreClick(event) {
  event.stopPropagation()
  showMenu.value = !showMenu.value
  if (showMenu.value) {
    const rect = event.currentTarget.getBoundingClientRect()
    menuPosition.value = {
      top: `${rect.bottom + window.scrollY + 6}px`,
      left: `${rect.left + window.scrollX}px`,
    }
  }
}

function closeMenu() {
  showMenu.value = false
}

function handleClickOutside(event) {
  if (moreButtonRef.value?.contains(event.target)) return
  if (!menuDropdownRef.value?.contains(event.target)) {
    closeMenu()
  }
}

function onRename() {
  closeMenu()
  emit('rename')
}

async function onCopyLink() {
  if (!props.chartId) return
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/bi/chart/${props.chartId}/`)
    toast.success('Ссылка успешно скопирована в буфер обмена')
  } catch (err) {
    toast.error('Не удалось скопировать ссылку: ' + err.message)
  }
  closeMenu()
}

function onDelete() {
  closeMenu()
  emit('delete')
}

onMounted(loadFavorites)
watch(() => props.chartId, loadFavorites, { immediate: true })

watch(showMenu, (open) => {
  if (open) {
    nextTick(() => document.addEventListener('mousedown', handleClickOutside))
  } else {
    document.removeEventListener('mousedown', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped lang="scss">
.body-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.header-label-icon {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.chart-type-icon-header {
  flex-shrink: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
  gap: 8px;
}

.header-name-cell {
  min-width: 0;
  overflow: hidden;
}

.header-actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 72px;
  flex-shrink: 0;
}

.header-label {
  margin: 0;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: var(--color-secondary-text);
  transition: background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background-color: var(--color-hover-background);
  color: var(--color-primary-text);
}

.action-btn.star {
  transition: all 0.2s ease;
}

.action-btn.star:not(.active) {
  opacity: 0;
}

.body-header:hover .action-btn.star:not(.active) {
  opacity: 1;
}

.action-btn.star.active {
  opacity: 1;
  color: #facc15;
}

.action-btn.star:hover {
  transform: scale(1.1);
}

.action-btn.more {
  opacity: 0;
}

.body-header:hover .action-btn.more,
.action-btn.more.menu-open {
  opacity: 1;
}

.action-btn.more.menu-open {
  background-color: var(--color-hover-background);
  color: var(--color-primary-text);
}

.header-label-buttons {
  display: flex;
  gap: 15px;
  flex-shrink: 0;
}

.border-elements {
  border-radius: 8px;
}

.elements-color {
  background-color: var(--color-primary-background);
}

.btn-full-screen:hover {
  background-color: var(--color-hover-background);
}
</style>

<style lang="scss">
.menu-dropdown {
  position: fixed;
  min-width: 140px;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border, #dee2e6);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 10000;
}

.menu-dropdown .menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  font-size: 14px;
  border: none;
  background: none;
  color: var(--color-primary-text);
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.menu-dropdown .menu-item:hover {
  background: var(--color-hover-background);
}

.menu-dropdown .menu-item.danger:hover {
  color: var(--color-danger, #dc3545);
}

.dropdown-menu-enter-active,
.dropdown-menu-leave-active {
  transition: opacity 0.2s ease;
}

.dropdown-menu-enter-from,
.dropdown-menu-leave-to {
  opacity: 0;
}
</style>
