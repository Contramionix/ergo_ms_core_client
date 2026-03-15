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
      <button class="btn" @click="showAddModal"><LayersPlus :size="18" class="me-2" style="vertical-align: middle;" />Добавить элемент</button>
      <button class="btn" @click="showAddSeparatorModal"><SeparatorHorizontal :size="18" class="me-2" style="vertical-align: middle;" />Добавить разделитель</button>
    </div>

    <UnsavedChangesToast :visible="hasUnsavedChanges" :saving="isSaving" title="Есть несохранённые изменения порядка" description="Сохраните или отмените изменения порядка элементов." cancel-label="Отменить" @save="saveAllChanges" @cancel="cancelChanges"/>
    <UnsavedChangesToast :visible="showDeleteSeparatorToast" :saving="isDeletingSeparator" title="Удаление разделителя" description="Вы уверены, что хотите удалить этот разделитель?" cancel-label="Отмена" save-label="Удалить" saving-label="Удаление..." @save="executeDeleteSeparator" @cancel="cancelDeleteSeparator"/>  
    <UnsavedChangesToast :visible="showDeleteItemToast" :saving="isDeletingItem" title="Удаление элемента меню" description="Вы уверены, что хотите удалить этот элемент? Это также удалит все дочерние элементы." cancel-label="Отмена" save-label="Удалить" saving-label="Удаление..." @save="executeDeleteItem" @cancel="cancelDeleteItem"/>

    <div class="menu-panel__items">
      <div v-if="isLoading" class="text-center py-5">
        <SpinnerLoading loading-text="Загрузка..." color="primary" />
      </div>
      <div v-else-if="menuItems.length === 0" class="alert alert-info">
        Элементы меню не найдены. Нажмите "Синхронизировать с модулями" для импорта.
      </div>
      <div v-else>
        <DraggableMenuList :items="visibleMenuItems" :separators="visibleSeparators" :expand-all-groups="expandAllGroups" @edit="editItem" @delete="confirmDeleteItem" @reorder="handleMenuReorder" @reorder-separators="handleSeparatorReorderFromList" @toggle-visibility="handleToggleVisibility" @edit-separator="editSeparator" @delete-separator="confirmDeleteSeparator" @toggle-visibility-separator="handleToggleSeparatorVisibility"/>
      </div>
    </div>

    <MenuItemModal v-if="showItemModal" :item="currentItem" :parent-options="parentOptions" :roles="roles" :role-groups="roleGroups" @save="saveItem" @close="closeItemModal"/>
    
    <MenuSeparatorModal v-if="showSeparatorModal" :separator="currentSeparator" @save="saveSeparator" @close="closeSeparatorModal"/>
    
    <ConfirmDialog />
    
    <MenuSettingsModal :show="showSettingsModal" @close="showSettingsModal = false" @save="handleSettingsSave"/>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { LayersPlus, SeparatorHorizontal, Settings } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
  reorderMenuItems
} from '@/core/cms/js/menuService.js'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import Cookies from 'js-cookie'

const toast = useToast()

const COOKIE_NAME = 'menu_panel_expand_all_groups'
const expandAllGroups = ref(false)

const isLoading = ref(false)
const isSaving = ref(false)
const isDeletingSeparator = ref(false)
const isDeletingItem = ref(false)
const menuItems = ref([])
const separators = ref([])
const roles = ref([])
const roleGroups = ref([])

const showDeleteSeparatorToast = ref(false)
const separatorToDelete = ref(null)

const showDeleteItemToast = ref(false)
const itemToDelete = ref(null)

const pendingMenuReorder = ref([])
const pendingSeparatorReorder = ref([])

const initialCombinedOrder = ref([])

function buildCombinedOrder(rootItems, sepList) {
  const menuEntries = rootItems.map(item => ({ type: 'menu_item', id: item.id, _sortOrder: item.order }))
  const sepEntries = sepList.map(sep => ({ type: 'separator', id: sep.id, _sortOrder: sep.before_order }))
  const combined = [...menuEntries, ...sepEntries]
  combined.sort((a, b) => {
    if (a._sortOrder !== b._sortOrder) return a._sortOrder - b._sortOrder
    if (a.type === 'separator' && b.type !== 'separator') return -1
    if (a.type !== 'separator' && b.type === 'separator') return 1
    return 0
  })
  return combined.map(({ type, id }) => ({ type, id }))
}

function combinedOrderEquals(a, b) {
  if (a.length !== b.length) return false
  return a.every((entry, i) => entry.type === b[i].type && entry.id === b[i].id)
}

const currentCombinedOrder = computed(() =>
  buildCombinedOrder(visibleMenuItems.value, visibleSeparators.value)
)

const hasUnsavedChanges = computed(() =>
  initialCombinedOrder.value.length > 0 &&
  !combinedOrderEquals(initialCombinedOrder.value, currentCombinedOrder.value)
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

onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value && !window.confirm('Есть несохранённые изменения порядка. Уйти без сохранения?')) {
    next(false)
  } else {
    next()
  }
})

const visibleSeparators = computed(() => {
  if (!separatorToDelete.value) {
    return separators.value
  }
  return separators.value.filter(sep => sep.id !== separatorToDelete.value.id)
})

const visibleMenuItems = computed(() => {
  if (!itemToDelete.value) {
    return menuItems.value
  }
  
  function removeItemFromTree(items, itemId) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === itemId) {
        items.splice(i, 1)
        return true
      }
      if (items[i].children && items[i].children.length > 0) {
        if (removeItemFromTree(items[i].children, itemId)) {
          return true
        }
      }
    }
    return false
  }
  
  const treeCopy = JSON.parse(JSON.stringify(menuItems.value))
  removeItemFromTree(treeCopy, itemToDelete.value.id)
  return treeCopy
})

const showItemModal = ref(false)
const showSeparatorModal = ref(false)
const showSettingsModal = ref(false)
const currentItem = ref(null)
const currentSeparator = ref(null)

const parentOptions = computed(() => {
  const options = [{ id: null, name: '-- Нет (корневой элемент) --' }]
  
  function addItems(items, prefix = '') {
    for (const item of items) {
      options.push({
        id: item.id,
        name: `${prefix}${item.name}`
      })
      if (item.children && item.children.length > 0) {
        addItems(item.children, `${prefix}  └ `)
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
    console.error('[MenuPanel] Load error:', error)
    toast.error('Ошибка загрузки элементов меню: ' + error.message)
  } finally {
    isLoading.value = false
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
  
  const sortByOrder = (a, b) => a.order - b.order
  roots.sort(sortByOrder)
  
  function sortChildren(items) {
    items.sort(sortByOrder)
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children)
      }
    })
  }
  
  sortChildren(roots)
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
    console.error('Ошибка загрузки ролей:', error)
  }
}

async function loadRoleGroups() {
  try {
    const response = await apiClient.get(endpoints.cms.roleGroups.list)
    if (response.success) {
      roleGroups.value = response.data
    }
  } catch (error) {
    console.error('Ошибка загрузки ролевых групп:', error)
  }
}

function handleMenuReorder(reorderedItems) {
  pendingMenuReorder.value = [...pendingMenuReorder.value, ...reorderedItems]
  
  nextTick(() => {
    const parentMap = new Map(reorderedItems.map(item => [item.id, item.parent_id]).filter(([, parentId]) => parentId !== undefined))
    
    function findItemInTree(items, itemId) {
      for (const item of items) {
        if (item.id === itemId) return { item, parent: null, items }
        if (item.children && item.children.length > 0) {
          const found = findItemInTree(item.children, itemId)
          if (found) return found
        }
      }
      return null
    }
    
    for (const reorderedItem of reorderedItems) {
      const found = findItemInTree(menuItems.value, reorderedItem.id)
      if (found) {
        found.item.order = reorderedItem.order
        
        if (parentMap.has(reorderedItem.id)) {
          const newParentId = parentMap.get(reorderedItem.id)
          
          const oldIndex = found.items.findIndex(i => i.id === reorderedItem.id)
          if (oldIndex !== -1) {
            found.items.splice(oldIndex, 1)
          }
          
          if (newParentId === null) {
            menuItems.value.push(found.item)
          } else {
            const newParentFound = findItemInTree(menuItems.value, newParentId)
            if (newParentFound) {
              if (!newParentFound.item.children) {
                newParentFound.item.children = []
              }
              newParentFound.item.children.push(found.item)
            }
          }
        }
      }
    }
    
    function sortItems(items) {
      items.sort((a, b) => a.order - b.order)
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortItems(item.children)
        }
      })
    }
    
    sortItems(menuItems.value)
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

async function saveAllChanges() {
  isSaving.value = true
  
  try {
    const hasSeparatorChanges = pendingSeparatorReorder.value.length > 0
    
    if (pendingMenuReorder.value.length > 0) {
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
        items.forEach((item, index) => {
          let finalParentId = null
          if (menuParentMap.has(item.id)) {
            finalParentId = menuParentMap.get(item.id)
          } else {
            finalParentId = parentId
          }
          
          let order
          if (hasSeparatorChanges && menuOrderMap.has(item.id)) {
            order = menuOrderMap.get(item.id)
          } else {
            order = index * 10
          }
          
          allItemsToSave.push({
            id: item.id,
            order: order,
            parent_id: finalParentId
          })
          
          if (item.children && item.children.length > 0) {
            collectItems(item.children, item.id)
          }
        })
      }
      
      collectItems(menuItems.value)
      
      await reorderMenuItems(allItemsToSave)
    }
    
    if (pendingSeparatorReorder.value.length > 0) {
      for (const sep of pendingSeparatorReorder.value) {
        await updateMenuSeparator(sep.id, { before_order: sep.before_order })
      }
    }
    
    pendingMenuReorder.value = []
    pendingSeparatorReorder.value = []
    
    toast.success('Порядок элементов сохранён')
    clearMenuCache()
    
    window.dispatchEvent(new CustomEvent('menu-updated'))
    
    await Promise.all([
      loadMenuItems(),
      loadSeparators()
    ])
    syncInitialCombinedOrder()
  } catch (error) {
    console.error('[MenuPanel] Save error:', error)
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

function showAddModal() {
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
    clearMenuCache()
    window.dispatchEvent(new CustomEvent('menu-updated'))
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
    clearMenuCache()
    window.dispatchEvent(new CustomEvent('menu-updated'))
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
    function updateItemInTree(items, itemId, isActive) {
      for (const item of items) {
        if (item.id === itemId) {
          item.is_active = isActive
          return true
        }
        if (item.children && item.children.length > 0) {
          if (updateItemInTree(item.children, itemId, isActive)) {
            return true
          }
        }
      }
      return false
    }
    updateItemInTree(menuItems.value, data.id, data.is_active)
    clearMenuCache()
    window.dispatchEvent(new CustomEvent('menu-updated'))
  } catch (error) {
    toast.error('Ошибка обновления видимости: ' + error.message)
    await loadMenuItems()
  }
}

async function handleToggleSeparatorVisibility(separator) {
  try {
    await updateMenuSeparator(separator.id, { is_active: !separator.is_active })
    const sep = separators.value.find(s => s.id === separator.id)
    if (sep) {
      sep.is_active = !separator.is_active
    }
    clearMenuCache()
    window.dispatchEvent(new CustomEvent('menu-updated'))
  } catch (error) {
    toast.error('Ошибка обновления видимости разделителя: ' + error.message)
    await loadSeparators()
  }
}

function closeItemModal() {
  showItemModal.value = false
  currentItem.value = null
}

function showAddSeparatorModal() {
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
    clearMenuCache()
    window.dispatchEvent(new CustomEvent('menu-updated'))
  } catch (error) {
    toast.error('Ошибка сохранения: ' + error.message)
  }
}

function confirmDeleteSeparator(separator) {
  separatorToDelete.value = separator
  showDeleteSeparatorToast.value = true
}

async function executeDeleteSeparator() {
  if (!separatorToDelete.value) return
  
  isDeletingSeparator.value = true
  try {
    await deleteMenuSeparator(separatorToDelete.value.id)
    toast.success('Разделитель удалён')
    await loadSeparators()
    syncInitialCombinedOrder()
    clearMenuCache()
    window.dispatchEvent(new CustomEvent('menu-updated'))
    cancelDeleteSeparator()
  } catch (error) {
    toast.error('Ошибка удаления: ' + error.message)
  } finally {
    isDeletingSeparator.value = false
  }
}

function cancelDeleteSeparator() {
  showDeleteSeparatorToast.value = false
  separatorToDelete.value = null
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
      color: #6c757d;
      transition: color 0.3s ease;
      flex-shrink: 0;
      
      &:hover {
        color: #0d6efd;
        
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