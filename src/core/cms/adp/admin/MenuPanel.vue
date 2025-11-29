<template>
  <div class="menu-panel">
    <div class="menu-panel__header mb-4">
      <div class="d-flex align-items-center gap-2 mb-3">
        <h1 class="h3 mb-0">Управление меню</h1>
        <button 
          class="menu-panel__settings-btn"
          @click="showSettingsModal = true"
          title="Настройки страницы"
        >
          <Settings :size="20" class="menu-panel__settings-icon" />
        </button>
      </div>
      <p class="text-muted mb-0">
        Настройте элементы бокового меню и управляйте доступом к ним.
        Перетаскивайте элементы для изменения порядка.
      </p>
    </div>

    <!-- Панель действий -->
    <div class="menu-panel__actions d-flex gap-3 mb-4 flex-wrap">
      <button class="btn btn-primary" @click="showAddModal">
        <Plus :size="18" class="me-2" style="vertical-align: middle;" />
        Добавить элемент
      </button>
      <button class="btn btn-outline-secondary" @click="showAddSeparatorModal">
        <Minus :size="18" class="me-2" style="vertical-align: middle;" />
        Добавить разделитель
      </button>
    </div>

    <!-- Тост несохранённых изменений -->
    <UnsavedChangesToast
      :visible="hasUnsavedChanges"
      :saving="isSaving"
      title="Есть несохранённые изменения порядка"
      description="Сохраните или отмените изменения порядка элементов."
      cancel-label="Отменить"
      @save="saveAllChanges"
      @cancel="cancelChanges"
    />
    
    <!-- Тост подтверждения удаления разделителя -->
    <UnsavedChangesToast
      :visible="showDeleteSeparatorToast"
      :saving="isDeletingSeparator"
      title="Удаление разделителя"
      description="Вы уверены, что хотите удалить этот разделитель?"
      cancel-label="Отмена"
      save-label="Удалить"
      saving-label="Удаление..."
      @save="executeDeleteSeparator"
      @cancel="cancelDeleteSeparator"
    />
    
    <!-- Тост подтверждения удаления элемента меню -->
    <UnsavedChangesToast
      :visible="showDeleteItemToast"
      :saving="isDeletingItem"
      title="Удаление элемента меню"
      description="Вы уверены, что хотите удалить этот элемент? Это также удалит все дочерние элементы."
      cancel-label="Отмена"
      save-label="Удалить"
      saving-label="Удаление..."
      @save="executeDeleteItem"
      @cancel="cancelDeleteItem"
    />

    <!-- Список элементов меню с drag & drop -->
    <div class="menu-panel__items">
      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </div>
      
      <div v-else-if="menuItems.length === 0" class="alert alert-info">
        Элементы меню не найдены. Нажмите "Синхронизировать с модулями" для импорта.
      </div>
      
      <div v-else>
        <!-- Draggable список -->
        <DraggableMenuList
          :items="visibleMenuItems"
          :separators="visibleSeparators"
          :expand-all-groups="expandAllGroups"
          @edit="editItem"
          @delete="confirmDeleteItem"
          @reorder="handleMenuReorder"
          @reorder-separators="handleSeparatorReorderFromList"
          @toggle-visibility="handleToggleVisibility"
          @edit-separator="editSeparator"
          @delete-separator="confirmDeleteSeparator"
          @toggle-visibility-separator="handleToggleSeparatorVisibility"
        />
      </div>
    </div>

    <!-- Модальные окна -->
    <MenuItemModal 
      v-if="showItemModal"
      :item="currentItem"
      :parent-options="parentOptions"
      :roles="roles"
      :role-groups="roleGroups"
      :available-icons="availableIcons"
      @save="saveItem"
      @close="closeItemModal"
    />
    
    <MenuSeparatorModal
      v-if="showSeparatorModal"
      :separator="currentSeparator"
      @save="saveSeparator"
      @close="closeSeparatorModal"
    />
    
    <ConfirmDialog
      ref="confirmDialog"
    />
    
    <MenuSettingsModal
      :show="showSettingsModal"
      @close="showSettingsModal = false"
      @save="handleSettingsSave"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { Plus, Minus, Settings } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
  getAvailableIcons,
  clearMenuCache,
  reorderMenuItems
} from '@/core/cms/js/menuService.js'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import Cookies from 'js-cookie'

const toast = useToast()
const confirmDialog = ref(null)

// Настройка раскрытия групп
const COOKIE_NAME = 'menu_panel_expand_all_groups'
const expandAllGroups = ref(false)

// Состояние
const isLoading = ref(false)
const isSaving = ref(false)
const isDeletingSeparator = ref(false)
const isDeletingItem = ref(false)
const menuItems = ref([])
const separators = ref([])
const roles = ref([])
const roleGroups = ref([])
const availableIcons = ref([])

// Состояние для подтверждения удаления разделителя
const showDeleteSeparatorToast = ref(false)
const separatorToDelete = ref(null)

// Состояние для подтверждения удаления элемента меню
const showDeleteItemToast = ref(false)
const itemToDelete = ref(null)

// Отслеживание изменений порядка
const pendingMenuReorder = ref([])
const pendingSeparatorReorder = ref([])

// Флаг несохранённых изменений
const hasUnsavedChanges = computed(() => {
  return pendingMenuReorder.value.length > 0 || pendingSeparatorReorder.value.length > 0
})

// Подсчёт элементов меню (включая вложенные)
const menuItemsCount = computed(() => {
  function countItems(items) {
    let count = 0
    for (const item of items) {
      count++
      if (item.children && item.children.length > 0) {
        count += countItems(item.children)
      }
    }
    return count
  }
  return countItems(menuItems.value)
})

// Видимые разделители (исключая тот, который помечен для удаления)
const visibleSeparators = computed(() => {
  if (!separatorToDelete.value) {
    return separators.value
  }
  return separators.value.filter(sep => sep.id !== separatorToDelete.value.id)
})

// Видимые элементы меню (исключая тот, который помечен для удаления)
const visibleMenuItems = computed(() => {
  if (!itemToDelete.value) {
    return menuItems.value
  }
  
  // Функция для удаления элемента из дерева
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
  
  // Создаем глубокую копию дерева
  const treeCopy = JSON.parse(JSON.stringify(menuItems.value))
  removeItemFromTree(treeCopy, itemToDelete.value.id)
  return treeCopy
})

// Модальные окна
const showItemModal = ref(false)
const showSeparatorModal = ref(false)
const showSettingsModal = ref(false)
const currentItem = ref(null)
const currentSeparator = ref(null)

// Опции для родительского элемента
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

// Загрузка данных
async function loadMenuItems() {
  isLoading.value = true
  try {
    const items = await getMenuItems({ includeInactive: true })
    // Строим дерево из плоского списка
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
  
  // Создаём карту элементов
  items.forEach(item => {
    map[item.id] = { ...item, children: [] }
  })
  
  // Строим дерево
  items.forEach(item => {
    if (item.parent && map[item.parent]) {
      map[item.parent].children.push(map[item.id])
    } else {
      roots.push(map[item.id])
    }
  })
  
  // Сортируем по порядку
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

async function loadIcons() {
  try {
    availableIcons.value = await getAvailableIcons()
  } catch (error) {
    console.error('Ошибка загрузки иконок:', error)
  }
}

// Обработка перетаскивания элементов меню
function handleMenuReorder(reorderedItems) {
  // Сохраняем изменения для отложенного сохранения
  pendingMenuReorder.value = [...pendingMenuReorder.value, ...reorderedItems]
  
  // Обновляем order и структуру дерева в menuItems для корректного сохранения
  // Используем nextTick чтобы не вызвать пере-рендер во время drag
  nextTick(() => {
    const orderMap = new Map(reorderedItems.map(item => [item.id, item.order]))
    const parentMap = new Map(reorderedItems.map(item => [item.id, item.parent_id]).filter(([id, parentId]) => parentId !== undefined))
    
    // Функция для поиска элемента в дереве
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
    
    // Обновляем order и перемещаем элементы между родителями если нужно
    for (const reorderedItem of reorderedItems) {
      const found = findItemInTree(menuItems.value, reorderedItem.id)
      if (found) {
        // Обновляем order
        found.item.order = reorderedItem.order
        
        // Если parent_id изменился, перемещаем элемент
        if (parentMap.has(reorderedItem.id)) {
          const newParentId = parentMap.get(reorderedItem.id)
          
          // Удаляем из старого места
          const oldIndex = found.items.findIndex(i => i.id === reorderedItem.id)
          if (oldIndex !== -1) {
            found.items.splice(oldIndex, 1)
          }
          
          // Добавляем в новое место
          if (newParentId === null) {
            // Перемещаем в корень
            menuItems.value.push(found.item)
          } else {
            // Ищем нового родителя
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
    
    // Сортируем все уровни
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

// Обработка перетаскивания разделителей (из вкладки "Разделители")
function handleSeparatorReorder(reorderedSeparators) {
  pendingSeparatorReorder.value = reorderedSeparators
  
  // Обновляем локальное состояние
  const orderMap = new Map(reorderedSeparators.map(sep => [sep.id, sep.before_order]))
  for (const sep of separators.value) {
    if (orderMap.has(sep.id)) {
      sep.before_order = orderMap.get(sep.id)
    }
  }
  separators.value.sort((a, b) => a.before_order - b.before_order)
}

// Обработка перетаскивания разделителей (из общего списка элементов меню)
function handleSeparatorReorderFromList(reorderedSeparators) {
  // Добавляем к отложенным изменениям
  pendingSeparatorReorder.value = reorderedSeparators
  
  // Обновляем локальное состояние
  const orderMap = new Map(reorderedSeparators.map(sep => [sep.id, sep.before_order]))
  for (const sep of separators.value) {
    if (orderMap.has(sep.id)) {
      sep.before_order = orderMap.get(sep.id)
    }
  }
  separators.value.sort((a, b) => a.before_order - b.before_order)
}

// Сохранение всех изменений порядка
async function saveAllChanges() {
  isSaving.value = true
  
  try {
    // Проверяем, были ли изменены разделители (объединённый список)
    const hasSeparatorChanges = pendingSeparatorReorder.value.length > 0
    
    // Сохраняем порядок элементов меню
    if (pendingMenuReorder.value.length > 0) {
      // Группируем изменения по id (берём последнее значение)
      const menuOrderMap = new Map()
      const menuParentMap = new Map()
      for (const item of pendingMenuReorder.value) {
        menuOrderMap.set(item.id, item.order)
        if (item.parent_id !== undefined) {
          menuParentMap.set(item.id, item.parent_id)
        }
      }
      
      // Собираем ВСЕ элементы из дерева с актуальными order и parent_id
      const allItemsToSave = []
      
      function collectItems(items, parentId = null) {
        items.forEach((item, index) => {
          // Определяем parent_id для текущего элемента
          let finalParentId = null
          if (menuParentMap.has(item.id)) {
            // Элемент был перемещён - используем новый parent_id из pendingMenuReorder
            finalParentId = menuParentMap.get(item.id)
          } else {
            // Элемент не был перемещён - используем текущий parentId из дерева
            finalParentId = parentId
          }
          
          // Если есть изменения разделителей (объединённый список) - используем order из pendingMenuReorder
          // Иначе пересчитываем на основе позиции в массиве
          let order
          if (hasSeparatorChanges && menuOrderMap.has(item.id)) {
            // Используем order из объединённого списка (учитывает разделители)
            order = menuOrderMap.get(item.id)
          } else {
            // Пересчитываем order на основе позиции в массиве
            order = index * 10
          }
          
          allItemsToSave.push({
            id: item.id,
            order: order,
            parent_id: finalParentId
          })
          
          // Рекурсивно обрабатываем детей
          // Используем ID текущего элемента как parentId для детей
          if (item.children && item.children.length > 0) {
            collectItems(item.children, item.id)
          }
        })
      }
      
      collectItems(menuItems.value)
      
      await reorderMenuItems(allItemsToSave)
    }
    
    // Сохраняем порядок разделителей
    if (pendingSeparatorReorder.value.length > 0) {
      for (const sep of pendingSeparatorReorder.value) {
        await updateMenuSeparator(sep.id, { before_order: sep.before_order })
      }
    }
    
    // Очищаем очередь изменений
    pendingMenuReorder.value = []
    pendingSeparatorReorder.value = []
    
    toast.success('Порядок элементов сохранён')
    clearMenuCache()
    
    // Уведомляем MenuList об обновлении меню
    window.dispatchEvent(new CustomEvent('menu-updated'))
    
    // Перезагружаем данные с сервера для синхронизации
    await Promise.all([
      loadMenuItems(),
      loadSeparators()
    ])
  } catch (error) {
    console.error('[MenuPanel] Save error:', error)
    toast.error('Ошибка сохранения порядка: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

// Отмена изменений порядка
async function cancelChanges() {
  // Очищаем очереди изменений
  pendingMenuReorder.value = []
  pendingSeparatorReorder.value = []
  
  // Перезагружаем данные с сервера
  await Promise.all([
    loadMenuItems(),
    loadSeparators()
  ])
  
  toast.info('Изменения порядка отменены')
}

// Управление элементами меню
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

// Переключение видимости элемента
async function handleToggleVisibility(data) {
  try {
    await updateMenuItem(data.id, { is_active: data.is_active })
    // Обновляем локальное состояние
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
    // Перезагружаем данные при ошибке
    await loadMenuItems()
  }
}

// Переключение видимости разделителя
async function handleToggleSeparatorVisibility(separator) {
  try {
    await updateMenuSeparator(separator.id, { is_active: !separator.is_active })
    // Обновляем локальное состояние
    const sep = separators.value.find(s => s.id === separator.id)
    if (sep) {
      sep.is_active = !separator.is_active
    }
    clearMenuCache()
    window.dispatchEvent(new CustomEvent('menu-updated'))
  } catch (error) {
    toast.error('Ошибка обновления видимости разделителя: ' + error.message)
    // Перезагружаем данные при ошибке
    await loadSeparators()
  }
}

function closeItemModal() {
  showItemModal.value = false
  currentItem.value = null
}

// Управление разделителями
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

// Обработка сохранения настроек
function handleSettingsSave(newValue) {
  // Обновляем локальное состояние
  expandAllGroups.value = newValue
  toast.success('Настройки сохранены')
}

// Загрузка значения из куки
function loadExpandAllGroupsFromCookie() {
  const value = Cookies.get(COOKIE_NAME)
  expandAllGroups.value = value === 'true'
}

// Инициализация
onMounted(async () => {
  // Загружаем настройку из куки
  loadExpandAllGroupsFromCookie()
  
  await Promise.all([
    loadMenuItems(),
    loadSeparators(),
    loadRoles(),
    loadRoleGroups(),
    loadIcons()
  ])
})
</script>

<style lang="scss" scoped>
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

.menu-list-header,
.separator-list-header {
  padding: 0.5rem;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// Адаптивность для мобильных устройств
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
  
  .menu-list-header,
  .separator-list-header {
    display: none;
  }
}
</style>

