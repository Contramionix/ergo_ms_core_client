<template>
  <header class="file_area_header">
    <div class="file_area_header_label">
      <Database />
      <div class="header-title-row">
        <div class="header-name-cell">
          <h4 class="header-label">{{ headerName }}</h4>
        </div>
        <div v-if="datasetId && datasetId !== 'new'" class="header-actions-cell">
          <button class="action-btn star" :class="{ active: isFavorite }" @click.stop="toggleFavorite" title="Избранное">
            <Star :size="18" />
          </button>
          <button ref="moreButtonRef" class="action-btn more" :class="{ 'menu-open': showMenu }" @click="onMoreClick" title="Ещё">
            <MoreHorizontal :size="18" />
          </button>
        </div>
      </div>
    </div>
    <div class="file_area_header_buttons">
      <button v-if="isNewPage" class="btn btn-primary" :disabled="!canCreateDataset || saving" @click="$emit('showDatasetDialog')">Создать датасет</button>
      <button class="btn btn-success save-btn" :hidden="isNewPage" :disabled="!isDirty || saving" @click="handleSave"
        style="color: var(--color-primary-background); position: relative;">
        <span v-if="!saving && !saveSuccess">Сохранить датасет</span>
        <span v-else-if="saving" class="saving-spinner">
          <SpinnerLoading loading-text="Сохраняем…" color="#fff" />
        </span>
        <span v-else-if="saveSuccess" style="display: flex; align-items: center; gap: 6px;">
          <svg width="22" height="22" viewBox="0 0 20 20">
            <polyline points="4,10 9,16 17,4" stroke="#fff" stroke-width="3" fill="none" />
          </svg>Сохранено!
        </span>
      </button>
    </div>
  </header>

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
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Database, Star, MoreHorizontal, CaseSensitive, Link, Trash2 } from 'lucide-vue-next'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import { useToast } from 'vue-toastification'

const FAVORITES_STORAGE_KEY = 'favoriteDatasets'

const props = defineProps({
  headerName: String,
  isNewPage: Boolean,
  canCreateDataset: Boolean,
  saving: Boolean,
  saveSuccess: Boolean,
  isDirty: Boolean,
  datasetId: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits(['showDatasetDialog', 'editDataset', 'rename', 'delete'])

const toast = useToast()
const favorites = ref(new Set())
const showMenu = ref(false)
const menuPosition = ref({ top: '0px', left: '0px' })
const menuDropdownRef = ref(null)
const moreButtonRef = ref(null)

const isFavorite = computed(() => {
  if (!props.datasetId) return false
  return favorites.value.has(String(props.datasetId))
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
  if (!props.datasetId) return
  const id = String(props.datasetId)
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
      top: `${rect.bottom + 6}px`,
      left: `${rect.left}px`
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
  if (!props.datasetId) return
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/bi/datasets/${props.datasetId}/`)
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
watch(() => props.datasetId, loadFavorites, { immediate: true })

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

function handleSave() {
  const name = (props.headerName || '').trim()
  if (!name) return
  emit('editDataset', name)
}
</script>

<style scoped lang="scss">
.file_area_header {
  position: relative;
  grid-area: header;
  background-color: var(--color-header-background);
  display: flex;
  align-items: center;
  padding: 0 1rem;
  gap: 20px;
  height: 61px;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  border-bottom: 1px solid var(--color-border);
}

.file_area_header_label {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.header-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
  gap: 8px;
}

.header-actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 72px;
  flex-shrink: 0;
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

.file_area_header:hover .action-btn.star:not(.active) {
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

.file_area_header:hover .action-btn.more,
.action-btn.more.menu-open {
  opacity: 1;
}

.action-btn.more.menu-open {
  background-color: var(--color-hover-background);
  color: var(--color-primary-text);
}

.header-name-cell {
  min-width: 0;
  overflow: hidden;
}

.header-label {
  margin: 0;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file_area_header_buttons {
  margin-left: auto;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.btn{
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
  height: 28px;
  font-weight: 400;
  border-radius: 6px;
  padding: 12px;
}

@media (max-width: 575.98px) {
  .btn {
    font-size: 12px;
  }
}

@media (min-width: 576px) and (max-width: 767.98px) {
  .btn {
    font-size: 13px;
  }
}

@media (min-width: 768px) and (max-width: 991.98px) {
  .btn {
    font-size: 14px;
  }
}

.btn-success {
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn .saving-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn .saving-spinner :deep(.spinner-loading) {
  flex-direction: row;
  gap: 0.5rem;
}

.save-btn .saving-spinner :deep(.spinner-loading__ring) {
  width: 22px;
  height: 22px;
  border-width: 2px;
}

.save-btn .saving-spinner :deep(.spinner-loading__text) {
  font-size: inherit;
  margin: 0;
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