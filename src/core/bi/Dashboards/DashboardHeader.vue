<template>
  <div class="body-header border-elements elements-color">
    <div class="header-label-icon">
      <LayoutDashboard />
      <div class="header-title-row">
        <div ref="headerLabelTextRef" class="header-label-text" :class="{ clickable: pages.length > 1, 'dropdown-open': showPageDropdown }" @click="togglePageDropdown" @mouseenter="handleHeaderHover" @mouseleave="handleHeaderLeave">
          <h4 class="header-label" :style="{ marginBottom: pages.length > 1 ? '-2px' : '3px' }">{{ dashboardName }}</h4>
          <div v-if="pages.length > 1" class="header-label-pages" :class="{ flipping: isFlipping }" style="color: var(--color-secondary-text); font-size: 14px;">
            <span class="text-content">{{ displayText }}</span>
          </div>

          <div v-if="showPageDropdown && pages.length > 1" class="page-dropdown" :style="{ width: dropdownWidth + 'px' }">
            <div v-for="(page, index) in pages" :key="index" class="page-dropdown-item" :class="{ active: index === currentPageIndex }" @click="selectPage(index, $event)">
              {{ page.name }}
            </div>
          </div>
        </div>
        <div v-if="dashboardId && dashboardId !== 'new'" class="header-actions-cell">
          <button class="action-btn star" :class="{ active: isFavorite }" @click.stop="toggleFavorite" title="Избранное">
            <Star :size="18" />
          </button>
          <button ref="moreButtonRef" class="action-btn more" :class="{ 'menu-open': showMenu }" @click="onMoreClick" title="Ещё">
            <MoreHorizontal :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="isHeaderButtonsReady" class="header-label-buttons">
      <template v-if="isViewMode">
        <button v-if="canEditDashboard" class="btn btn-sm btn-primary" @click="$emit('go-to-edit-mode')">
          <Pencil :size="16" class="btn-icon-inline" />Редактировать
        </button>
      </template>
      <template v-else>
        <button class="btn btn-sm btn-secondary" @click="$emit('show-pages')">Страницы</button>
        <button class="btn btn-sm btn-primary" :disabled="!dashboardRequiredFieldsFilled || !isDashboardDirty" @click="$emit('save-click')">
          {{ isEditMode ? 'Сохранить изменения' : 'Создать дашборд' }}
        </button>
      </template>
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
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { LayoutDashboard, Pencil, Star, MoreHorizontal, CaseSensitive, Link, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

const FAVORITES_STORAGE_KEY = 'favoriteDashboards'

const props = defineProps({
  dashboardName: { type: String, default: 'Новый дашборд' },
  dashboardId: { type: [Number, String], default: null },
  pages: { type: Array, default: () => [] },
  currentPageIndex: { type: Number, default: 0 },
  isViewMode: { type: Boolean, default: false },
  canEditDashboard: { type: Boolean, default: true },
  isEditMode: { type: Boolean, default: true },
  dashboardRequiredFieldsFilled: { type: Boolean, default: false },
  isDashboardDirty: { type: Boolean, default: true },
  isHeaderButtonsReady: { type: Boolean, default: true }
})

const emit = defineEmits([
  'toggle-page-dropdown',
  'select-page',
  'go-to-edit-mode',
  'save-click',
  'show-pages',
  'rename',
  'delete'
])

const toast = useToast()
const favorites = ref(new Set())
const showMenu = ref(false)
const menuPosition = ref({ top: '0px', left: '0px' })
const menuDropdownRef = ref(null)
const moreButtonRef = ref(null)
const showPageDropdown = ref(false)
const headerHoverText = ref('')
const isFlipping = ref(false)
const headerLabelTextRef = ref(null)
const dropdownWidth = ref(200)

const currentPageName = computed(() => props.pages[props.currentPageIndex]?.name || 'Страница 1')

const displayText = computed(() => {
  if (showPageDropdown.value) return 'Сменить страницу'
  return headerHoverText.value || currentPageName.value
})

const isFavorite = computed(() => {
  if (!props.dashboardId) return false
  return favorites.value.has(String(props.dashboardId))
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
  if (!props.dashboardId) return
  const id = String(props.dashboardId)
  if (favorites.value.has(id)) {
    favorites.value.delete(id)
  } else {
    favorites.value.add(id)
  }
  saveFavorites()
}

function togglePageDropdown() {
  if (props.pages.length > 1) {
    showPageDropdown.value = !showPageDropdown.value
    if (showPageDropdown.value && headerLabelTextRef.value) {
      dropdownWidth.value = headerLabelTextRef.value.offsetWidth
    }
  }
}

function handleHeaderHover() {
  if (props.pages.length > 1) {
    isFlipping.value = true
    setTimeout(() => {
      headerHoverText.value = 'Сменить страницу'
      isFlipping.value = false
    }, 150)
  }
}

function handleHeaderLeave() {
  if (props.pages.length > 1) {
    isFlipping.value = true
    setTimeout(() => {
      headerHoverText.value = ''
      isFlipping.value = false
    }, 150)
  }
}

function selectPage(index, event) {
  event.stopPropagation()
  showPageDropdown.value = false
  emit('select-page', index)
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
  const headerLabelText = event.target.closest('.header-label-text')
  const pageDropdown = event.target.closest('.page-dropdown')
  if (!headerLabelText && !pageDropdown) {
    showPageDropdown.value = false
  }
  if (moreButtonRef.value?.contains(event.target)) return
  if (menuDropdownRef.value && !menuDropdownRef.value.contains(event.target)) {
    closeMenu()
  }
}

function onRename() {
  closeMenu()
  emit('rename')
}

async function onCopyLink() {
  if (!props.dashboardId) return
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/bi/dashboard/${props.dashboardId}/`)
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

onMounted(() => {
  loadFavorites()
  document.addEventListener('click', handleClickOutside)
})

watch(() => props.dashboardId, loadFavorites, { immediate: true })

watch(showMenu, (open) => {
  if (open) {
    nextTick(() => document.addEventListener('mousedown', handleClickOutside))
  } else {
    document.removeEventListener('mousedown', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped lang="scss">
.body-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 15px;
  flex-shrink: 0;
  position: relative;
}

.header-label-icon {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  align-items: center;
  position: relative;
  flex: 0 1 auto;
  min-width: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 0 1 auto;
  gap: 8px;
}

.btn-icon-inline {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 6px;
}

.header-label-text {
  position: relative;
  overflow: visible;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: 5px;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex: 0 1 auto;

  &.clickable:hover {
    cursor: pointer;
    background-color: var(--color-hover-background);
  }

  &.dropdown-open {
    background-color: var(--color-hover-background);
  }
}

.page-dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 150px;
  animation: dropdownFadeIn 0.2s ease;
}

.page-dropdown-item {
  padding: 10px 16px;
  cursor: pointer;
  color: var(--color-text-primary);
  font-size: 14px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--color-hover-background);
  }

  &.active {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
    font-weight: 500;
  }

  &:first-child {
    border-radius: 8px 8px 0 0;
  }

  &:last-child {
    border-radius: 0 0 8px 8px;
  }
}

.header-label-pages {
  position: relative;
  overflow: hidden;
  height: 20px;

  .text-content {
    transition: transform 0.3s ease;
  }

  &.flipping .text-content {
    transform: rotateX(90deg);
  }
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
  align-items: center;
  gap: 15px;
  flex-shrink: 0;

  .btn {
    display: inline-flex;
    align-items: center;
  }
}

.border-elements {
  border-radius: 8px;
}

.elements-color {
  background-color: var(--color-primary-background);
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
