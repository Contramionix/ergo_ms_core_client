<template>
  <div class="menu-panel">
    <div class="menu-panel__header mb-4">
      <div class="d-flex align-items-center gap-2 mb-3">
        <h1 class="h3 mb-0">Управление меню</h1>
        <button class="menu-panel__settings-btn" @click="showSettingsModal = true" title="Настройки страницы"><Settings :size="20" class="menu-panel__settings-icon" /></button>
      </div>
      <p class="text-muted mb-0">Настройте элементы бокового меню и управляйте доступом к ним. Перетаскивайте элементы для изменения порядка.</p>
    </div>

    <div class="menu-panel__actions d-flex gap-3 mb-4 flex-wrap">
      <button class="btn" :disabled="isSaving || isRestoring" @click="showAddModal"><LayersPlus :size="18" class="me-2" style="vertical-align: middle;" />Добавить элемент</button>
      <button class="btn" :disabled="isSaving || isRestoring" @click="showAddSeparatorModal"><SeparatorHorizontal :size="18" class="me-2" style="vertical-align: middle;" />Добавить разделитель</button>
      <button class="btn btn-outline-secondary" :disabled="isSaving || isRestoring" @click="handleRestoreMenu">
        <span v-if="isRestoring" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        {{ isRestoring ? 'Восстановление...' : 'Восстановить из миграций' }}
      </button>
    </div>

    <UnsavedChangesToast :visible="hasUnsavedChanges" :saving="isSaving" title="Есть несохранённые изменения порядка" description="Сохраните или отмените изменения порядка элементов." cancel-label="Отменить" @save="saveAllChanges" @cancel="cancelChanges"/>
    <UnsavedChangesToast :visible="showDeleteSeparatorToast" :saving="isDeletingSeparator" :title="deleteSeparatorToastTitle" :description="deleteSeparatorToastDescription" cancel-label="Отмена" save-label="Удалить" saving-label="Удаление..." @save="executeDeleteSeparators" @cancel="cancelDeleteSeparators"/>  
    <UnsavedChangesToast :visible="showDeleteItemToast" :saving="isDeletingItem" title="Удаление элемента меню" description="Вы уверены, что хотите удалить этот элемент? Это также удалит все дочерние элементы." cancel-label="Отмена" save-label="Удалить" saving-label="Удаление..." @save="executeDeleteItem" @cancel="cancelDeleteItem"/>

    <div class="menu-panel__items">
      <div v-if="isLoading" class="text-center py-5">
        <SpinnerLoading loading-text="Загрузка..." color="primary" />
      </div>
      <div v-else-if="menuItems.length === 0" class="alert alert-info d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        <span>Элементы меню не найдены. Восстановите пункты из миграций ядра и модулей.</span>
        <button class="btn btn-primary" :disabled="isRestoring" @click="handleRestoreMenu">
          {{ isRestoring ? 'Восстановление...' : 'Восстановить из миграций' }}
        </button>
      </div>
      <div v-else>
        <DraggableMenuList :items="visibleMenuItems" :separators="visibleSeparators" :expand-all-groups="expandAllGroups" @edit="editItem" @delete="confirmDeleteItem" @reorder="handleMenuReorder" @reorder-separators="handleSeparatorReorderFromList" @toggle-visibility="handleToggleVisibility" @edit-separator="editSeparator" @delete-separator="confirmDeleteSeparator" @toggle-visibility-separator="handleToggleSeparatorVisibility"/>
      </div>
    </div>

    <MenuItemModal v-if="showItemModal" :item="currentItem" :parent-options="parentOptions" :roles="roles" :role-groups="roleGroups" @save="saveItem" @close="closeItemModal"/>
    
    <MenuSeparatorModal v-if="showSeparatorModal" :separator="currentSeparator" @save="saveSeparator" @close="closeSeparatorModal"/>
    
    <MenuSettingsModal :show="showSettingsModal" @close="showSettingsModal = false" @save="handleSettingsSave"/>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { LayersPlus, SeparatorHorizontal, Settings } from 'lucide-vue-next'
import { useToast } from '@/js/utils/toast.js'
import { confirmAction } from '@/js/utils/confirm.js'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import UnsavedChangesToast from '@/components/UnsavedChangesToast.vue'
import DraggableMenuList from './MenuPanelComponents/DraggableMenuList.vue'
import MenuItemModal from './MenuPanelComponents/MenuItemModal.vue'
import MenuSeparatorModal from './MenuPanelComponents/MenuSeparatorModal.vue'
import MenuSettingsModal from './MenuPanelComponents/MenuSettingsModal.vue'
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuSeparators,
  createMenuSeparator,
  updateMenuSeparator,
  deleteMenuSeparator,
  clearMenuCache,
  reorderMenuItems,
  restoreMenuFromMigrations
} from '@/core/cms/js/menuService.js'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import Cookies from 'js-cookie'

const toast = useToast()

const COOKIE_NAME = 'menu_panel_expand_all_groups'
const expandAllGroups = ref(false)

const isLoading = ref(false)
const isSaving = ref(false)
const isRestoring = ref(false)
const isDeletingSeparator = ref(false)
const isDeletingItem = ref(false)
const menuItems = ref([])
const separators = ref([])
const roles = ref([])
const roleGroups = ref([])

const separatorsToDelete = ref([])

const separatorsToDeleteIds = computed(() => new Set(separatorsToDelete.value.map(sep => sep.id)))

const showDeleteSeparatorToast = computed(() => separatorsToDelete.value.length > 0)

const deleteSeparatorToastTitle = computed(() =>
  separatorsToDelete.value.length === 1 ? 'Удаление разделителя' : 'Удаление разделителей'
)

const deleteSeparatorToastDescription = computed(() => {
  const count = separatorsToDelete.value.length
  if (count === 1) {
    return 'Вы уверены, что хотите удалить этот разделитель?'
  }
  return `Вы уверены, что хотите удалить ${count} разделителей?`
})

const showDeleteItemToast = ref(false)
const itemToDelete = ref(null)

const pendingMenuReorder = ref([])
const pendingSeparatorReorder = ref([])

const initialCombinedOrder = ref([])

function findInTree(items, itemId) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.id === itemId) return { item, items, index: i }
    if (item.children?.length) {
      const found = findInTree(item.children, itemId)
      if (found) return found
    }
  }
  return null
}

function sortTreeByOrder(items) {
  items.sort((a, b) => a.order - b.order)
  items.forEach(item => {
    if (item.children?.length) sortTreeByOrder(item.children)
  })
}

function notifyMenuUpdated() {
  clearMenuCache()
  window.dispatchEvent(new CustomEvent('menu-updated'))
}

function buildCombinedOrder(rootItems, sepList) {
  function flattenMenuItems(items, parentId = null) {
    const result = []
    for (const item of items) {
      result.push({ type: 'menu_item', id: item.id, parentId, _sortOrder: item.order })
      if (item.children && item.children.length > 0) {
        result.push(...flattenMenuItems(item.children, item.id))
      }
    }
    return result
  }
  
  const menuEntries = flattenMenuItems(rootItems)
  const sepEntries = sepList.map(sep => ({ type: 'separator', id: sep.id, parentId: null, _sortOrder: sep.before_order }))
  const combined = [...menuEntries, ...sepEntries]
  combined.sort((a, b) => {
    if (a.parentId !== b.parentId) {
      return (a.parentId || 0) - (b.parentId || 0)
    }
    if (a._sortOrder !== b._sortOrder) return a._sortOrder - b._sortOrder
    if (a.type === 'separator' && b.type !== 'separator') return -1
    if (a.type !== 'separator' && b.type === 'separator') return 1
    return 0
  })
  return combined.map(({ type, id, parentId }) => ({ type, id, parentId }))
}

function combinedOrderEquals(a, b) {
  if (a.length !== b.length) return false
  return a.every((entry, i) => entry.type === b[i].type && entry.id === b[i].id && entry.parentId === b[i].parentId)
}

const currentCombinedOrderForUnsaved = computed(() => {
  const roots = itemToDelete.value ? menuItems.value : visibleMenuItems.value
  const seps = separatorsToDelete.value.length > 0 ? separators.value : visibleSeparators.value
  return buildCombinedOrder(roots, seps)
})

const hasUnsavedChanges = computed(() =>
  initialCombinedOrder.value.length > 0 &&
  !combinedOrderEquals(initialCombinedOrder.value, currentCombinedOrderForUnsaved.value)
)

function syncInitialCombinedOrder() {
  initialCombinedOrder.value = buildCombinedOrder(menuItems.value, separators.value)
}

function onBeforeUnload(e) {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(async () => {
  if (!hasUnsavedChanges.value) {
    return true
  }

  return confirmAction({
    title: 'Несохранённые изменения',
    message: 'Есть несохранённые изменения порядка. Уйти без сохранения?',
    confirmText: 'Уйти',
    variant: 'danger',
  })
})

const visibleSeparators = computed(() =>
  separators.value.filter(sep => !separatorsToDeleteIds.value.has(sep.id))
)

const visibleMenuItems = computed(() => {
  if (!itemToDelete.value) return menuItems.value
  const treeCopy = JSON.parse(JSON.stringify(menuItems.value))
  const found = findInTree(treeCopy, itemToDelete.value.id)
  if (found) found.items.splice(found.index, 1)
  return treeCopy
})

const showItemModal = ref(false)
const showSeparatorModal = ref(false)
const showSettingsModal = ref(false)
const currentItem = ref(null)
const currentSeparator = ref(null)

const parentOptions = computed(() => {
  const options = [{ id: null, name: '-- Нет (корневой элемент) --', depth: 0 }]

  function addItems(items, depth = 0) {
    for (const item of items) {
      options.push({
        id: item.id,
        name: item.name,
        depth,
      })
      if (item.children && item.children.length > 0) {
        addItems(item.children, depth + 1)
      }
    }
  }

  addItems(menuItems.value)
  return options
})

async function loadMenuItems() {
  isLoading.value = true
  try {
    const items = await getMenuItems({ includeInactive: true })
    menuItems.value = buildTree(items)
  } catch (error) {
    logError('[MenuPanel] Load error:', error)
    toast.error('Ошибка загрузки элементов меню: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

async function handleRestoreMenu() {
  if (isRestoring.value) {
    return
  }

  isRestoring.value = true
  try {
    await restoreMenuFromMigrations()
    notifyMenuUpdated()
    await Promise.all([loadMenuItems(), loadSeparators()])
    toast.success('Меню восстановлено из миграций')
  } catch (error) {
    logError('[MenuPanel] Restore menu error:', error)
    toast.error(error.message || 'Не удалось восстановить меню')
  } finally {
    isRestoring.value = false
  }
}

function buildTree(items) {
  const map = {}
  const roots = []
  
  items.forEach(item => {
    map[item.id] = { ...item, children: [] }
  })
  
  items.forEach(item => {
    if (item.parent && map[item.parent]) {
      map[item.parent].children.push(map[item.id])
    } else {
      roots.push(map[item.id])
    }
  })
  sortTreeByOrder(roots)
  return roots
}

async function loadSeparators() {
  try {
    separators.value = await getMenuSeparators()
  } catch (error) {
    toast.error('Ошибка загрузки разделителей: ' + error.message)
  }
}

async function loadRoles() {
  try {
    const response = await apiClient.get(endpoints.cms.roles.list)
    if (response.success) {
      roles.value = response.data
    }
  } catch (error) {
    logError('Ошибка загрузки ролей:', error)
  }
}

async function loadRoleGroups() {
  try {
    const response = await apiClient.get(endpoints.cms.roleGroups.list)
    if (response.success) {
      roleGroups.value = response.data
    }
  } catch (error) {
    logError('Ошибка загрузки ролевых групп:', error)
  }
}

function handleMenuReorder(reorderedItems) {
  pendingMenuReorder.value = [...pendingMenuReorder.value, ...reorderedItems]
  nextTick(() => {
    const parentMap = new Map(reorderedItems.map(item => [item.id, item.parent_id]).filter(([, parentId]) => parentId !== undefined))
    for (const reorderedItem of reorderedItems) {
      const found = findInTree(menuItems.value, reorderedItem.id)
      if (!found) continue
      found.item.order = reorderedItem.order
      if (!parentMap.has(reorderedItem.id)) continue
      const newParentId = parentMap.get(reorderedItem.id)
      found.items.splice(found.index, 1)
      if (newParentId === null) {
        menuItems.value.push(found.item)
      } else {
        const newParentFound = findInTree(menuItems.value, newParentId)
        if (newParentFound) {
          if (!newParentFound.item.children) newParentFound.item.children = []
          newParentFound.item.children.push(found.item)
        }
      }
    }
    sortTreeByOrder(menuItems.value)
  })
}

function handleSeparatorReorderFromList(reorderedSeparators) {
  pendingSeparatorReorder.value = reorderedSeparators
  
  const orderMap = new Map(reorderedSeparators.map(sep => [sep.id, sep.before_order]))
  for (const sep of separators.value) {
    if (orderMap.has(sep.id)) {
      sep.before_order = orderMap.get(sep.id)
    }
  }
  separators.value.sort((a, b) => a.before_order - b.before_order)
}

function hasPendingOrderChanges() {
  return hasUnsavedChanges.value
    || pendingMenuReorder.value.length > 0
    || pendingSeparatorReorder.value.length > 0
}

function collectAllMenuItemsForSave() {
  const menuOrderMap = new Map()
  const menuParentMap = new Map()
  for (const item of pendingMenuReorder.value) {
    menuOrderMap.set(item.id, item.order)
    if (item.parent_id !== undefined) {
      menuParentMap.set(item.id, item.parent_id)
    }
  }

  const allItemsToSave = []

  function collectItems(items, parentId = null) {
    items.forEach((item) => {
      allItemsToSave.push({
        id: item.id,
        order: menuOrderMap.get(item.id) ?? item.order,
        parent_id: menuParentMap.get(item.id) ?? parentId
      })
      if (item.children?.length) collectItems(item.children, item.id)
    })
  }

  collectItems(menuItems.value)
  return allItemsToSave
}

function getSeparatorsToSave() {
  if (pendingSeparatorReorder.value.length > 0) {
    return pendingSeparatorReorder.value
  }
  return separators.value.map(sep => ({ id: sep.id, before_order: sep.before_order }))
}

async function saveAllChanges() {
  isSaving.value = true
  
  try {
    const shouldSaveMenu = pendingMenuReorder.value.length > 0 || hasUnsavedChanges.value
    const shouldSaveSep = pendingSeparatorReorder.value.length > 0 || hasUnsavedChanges.value

    if (shouldSaveMenu) {
      await reorderMenuItems(collectAllMenuItemsForSave())
    }
    
    if (shouldSaveSep) {
      for (const sep of getSeparatorsToSave()) {
        await updateMenuSeparator(sep.id, { before_order: sep.before_order })
      }
    }
    
    pendingMenuReorder.value = []
    pendingSeparatorReorder.value = []
    
    toast.success('Порядок элементов сохранён')
    notifyMenuUpdated()
    await Promise.all([
      loadMenuItems(),
      loadSeparators()
    ])
    syncInitialCombinedOrder()
  } catch (error) {
    logError('[MenuPanel] Save error:', error)
    toast.error('Ошибка сохранения порядка: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

async function cancelChanges() {
  pendingMenuReorder.value = []
  pendingSeparatorReorder.value = []
  await Promise.all([
    loadMenuItems(),
    loadSeparators()
  ])
  syncInitialCombinedOrder()
  toast.info('Изменения порядка отменены')
}

async function ensureChangesSaved() {
  await nextTick()
  if (!hasPendingOrderChanges()) return true
  await saveAllChanges()
  await nextTick()
  return !hasPendingOrderChanges()
}

async function showAddModal() {
  if (!(await ensureChangesSaved())) return
  currentItem.value = null
  showItemModal.value = true
}

function editItem(item) {
  currentItem.value = { ...item }
  showItemModal.value = true
}

async function saveItem(itemData) {
  try {
    if (itemData.id) {
      await updateMenuItem(itemData.id, itemData)
      toast.success('Элемент меню обновлён')
    } else {
      await createMenuItem(itemData)
      toast.success('Элемент меню создан')
    }
    closeItemModal()
    await loadMenuItems()
    syncInitialCombinedOrder()
    notifyMenuUpdated()
  } catch (error) {
    toast.error('Ошибка сохранения: ' + error.message)
  }
}

function confirmDeleteItem(item) {
  itemToDelete.value = item
  showDeleteItemToast.value = true
}

async function executeDeleteItem() {
  if (!itemToDelete.value) return

  isDeletingItem.value = true
  try {
    await deleteMenuItem(itemToDelete.value.id)
    toast.success('Элемент меню удалён')
    await loadMenuItems()
    syncInitialCombinedOrder()
    notifyMenuUpdated()
    cancelDeleteItem()
  } catch (error) {
    toast.error('Ошибка удаления: ' + error.message)
  } finally {
    isDeletingItem.value = false
  }
}

function cancelDeleteItem() {
  showDeleteItemToast.value = false
  itemToDelete.value = null
}

async function handleToggleVisibility(data) {
  try {
    await updateMenuItem(data.id, { is_active: data.is_active })
    const found = findInTree(menuItems.value, data.id)
    if (found) found.item.is_active = data.is_active
    notifyMenuUpdated()
  } catch (error) {
    toast.error('Ошибка обновления видимости: ' + error.message)
    await loadMenuItems()
  }
}

async function handleToggleSeparatorVisibility(separator) {
  try {
    await updateMenuSeparator(separator.id, { is_active: !separator.is_active })
    const sep = separators.value.find(s => s.id === separator.id)
    if (sep) sep.is_active = !separator.is_active
    notifyMenuUpdated()
  } catch (error) {
    toast.error('Ошибка обновления видимости разделителя: ' + error.message)
    await loadSeparators()
  }
}

function closeItemModal() {
  showItemModal.value = false
  currentItem.value = null
}

async function showAddSeparatorModal() {
  if (!(await ensureChangesSaved())) return
  currentSeparator.value = null
  showSeparatorModal.value = true
}

function editSeparator(separator) {
  currentSeparator.value = { ...separator }
  showSeparatorModal.value = true
}

async function saveSeparator(separatorData) {
  try {
    if (separatorData.id) {
      await updateMenuSeparator(separatorData.id, separatorData)
      toast.success('Разделитель обновлён')
    } else {
      await createMenuSeparator(separatorData)
      toast.success('Разделитель создан')
    }
    closeSeparatorModal()
    await loadSeparators()
    syncInitialCombinedOrder()
    notifyMenuUpdated()
  } catch (error) {
    toast.error('Ошибка сохранения: ' + error.message)
  }
}

function confirmDeleteSeparator(separator) {
  if (separatorsToDeleteIds.value.has(separator.id)) return
  separatorsToDelete.value.push(separator)
}

async function executeDeleteSeparators() {
  const queue = [...separatorsToDelete.value]
  if (!queue.length) return

  isDeletingSeparator.value = true
  try {
    for (const sep of queue) {
      await deleteMenuSeparator(sep.id)
    }
    toast.success(
      queue.length === 1
        ? 'Разделитель удалён'
        : `Удалено разделителей: ${queue.length}`
    )
    await loadSeparators()
    syncInitialCombinedOrder()
    notifyMenuUpdated()
    cancelDeleteSeparators()
  } catch (error) {
    toast.error('Ошибка удаления: ' + error.message)
    await loadSeparators()
  } finally {
    isDeletingSeparator.value = false
  }
}

function cancelDeleteSeparators() {
  separatorsToDelete.value = []
}

function closeSeparatorModal() {
  showSeparatorModal.value = false
  currentSeparator.value = null
}

function handleSettingsSave(newValue) {
  expandAllGroups.value = newValue
  toast.success('Настройки сохранены')
}

function loadExpandAllGroupsFromCookie() {
  const value = Cookies.get(COOKIE_NAME)
  expandAllGroups.value = value === 'true'
}

onMounted(async () => {
  loadExpandAllGroupsFromCookie()
  await Promise.all([
    loadMenuItems(),
    loadSeparators(),
    loadRoles(),
    loadRoleGroups()
  ])
  syncInitialCombinedOrder()
  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<style lang="scss" scoped>
.btn {
  display: flex;
  align-items: center;
  background: var(--color-primary-background);

  &:hover {
    background: var(--color-hover-background);
  }
}
.menu-panel {
  padding: 1.5rem;
  
  &__header {
    .menu-panel__settings-btn {
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-secondary-text);
      transition: color 0.3s ease;
      flex-shrink: 0;
      
      &:hover {
        color: var(--color-accent);
        
        .menu-panel__settings-icon {
          transform: rotate(180deg);
        }
      }
    }
    
    .menu-panel__settings-icon {
      transition: transform 0.5s ease;
      transform: rotate(0deg);
    }
  }
  
  &__items,
  &__separators {
    background: var(--color-secondary-background);
    border-radius: 8px;
  }
}

@media (max-width: 768px) {
  .menu-panel {
    padding: 0.75rem;
    
    &__actions {
      flex-direction: column;
      
      .btn {
        width: 100%;
      }
    }
  }
}
</style>