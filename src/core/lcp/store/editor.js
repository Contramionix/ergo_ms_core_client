import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import lcpApi from '../js/api'

export const useEditorStore = defineStore('lcpEditor', () => {
  // Текущий модуль и страница
  const currentModule = ref(null)
  const currentPage = ref(null)
  
  // Дерево компонентов
  const componentTree = ref([])
  
  // Выбранный компонент
  const selectedComponent = ref(null)
  const selectedComponentId = ref(null)
  
  // Палитра компонентов
  const palette = ref([])
  
  // Состояния
  const isLoading = ref(false)
  const isSaving = ref(false)
  const hasUnsavedChanges = ref(false)
  
  // История для undo/redo
  const history = ref([])
  const historyIndex = ref(-1)
  const maxHistorySize = 50
  
  // Computed
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)
  
  // Загрузка модуля
  async function loadModule(slug) {
    isLoading.value = true
    try {
      const { data } = await lcpApi.modules.getFull(slug)
      currentModule.value = data
      return data
    } finally {
      isLoading.value = false
    }
  }
  
  // Загрузка страницы
  async function loadPage(moduleSlug, pageSlug) {
    isLoading.value = true
    try {
      const { data } = await lcpApi.pages.getByPath(moduleSlug, pageSlug)
      currentPage.value = data
      componentTree.value = data.component_tree || []
      
      // Сброс истории
      history.value = [JSON.stringify(componentTree.value)]
      historyIndex.value = 0
      hasUnsavedChanges.value = false
      
      return data
    } finally {
      isLoading.value = false
    }
  }
  
  // Загрузка палитры компонентов
  async function loadPalette(moduleId = null) {
    try {
      const { data } = await lcpApi.componentTemplates.getPalette(moduleId)
      palette.value = data
      return data
    } catch (e) {
      console.error('Ошибка загрузки палитры:', e)
      return []
    }
  }
  
  // Сохранение страницы
  async function savePage(isDraft = false, isHomepage = null) {
    if (!currentPage.value) return
    
    isSaving.value = true
    try {
      const updateData = {
        component_tree: componentTree.value,
        is_draft: isDraft
      }
      
      // Если передано значение is_homepage, обновляем его
      if (isHomepage !== null) {
        updateData.is_homepage = isHomepage
      }
      
      const { data } = await lcpApi.pages.update(currentPage.value.id, updateData)
      currentPage.value = data
      hasUnsavedChanges.value = false
      return data
    } finally {
      isSaving.value = false
    }
  }
  
  // Установка/снятие страницы как главной
  async function setAsHomepage(isHomepage) {
    if (!currentPage.value) return
    
    isSaving.value = true
    try {
      const { data } = await lcpApi.pages.update(currentPage.value.id, {
        is_homepage: isHomepage
      })
      currentPage.value = data
      return data
    } finally {
      isSaving.value = false
    }
  }
  
  // Добавить компонент
  function addComponent(template, parentId = null, position = null) {
    const newComponent = createComponentFromTemplate(template)
    
    if (parentId) {
      // Добавить в родительский компонент
      const parent = findComponentById(componentTree.value, parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        if (position !== null) {
          parent.children.splice(position, 0, newComponent)
        } else {
          parent.children.push(newComponent)
        }
      }
    } else {
      // Добавить в корень
      if (position !== null) {
        componentTree.value.splice(position, 0, newComponent)
      } else {
        componentTree.value.push(newComponent)
      }
    }
    
    pushHistory()
    selectComponent(newComponent.uid)
    return newComponent
  }
  
  // Создать компонент из шаблона
  function createComponentFromTemplate(template) {
    return {
      uid: uuidv4(),
      type: template.component_type,
      name: template.name,
      templateId: template.id,
      props: { ...template.default_props },
      styles: { ...template.default_styles },
      classes: [...(template.default_classes || [])],
      events: [...(template.default_events || [])],
      children: [],
      visible: true,
    }
  }
  
  // Удалить компонент
  function removeComponent(uid) {
    const removeFromTree = (tree) => {
      const index = tree.findIndex(c => c.uid === uid)
      if (index !== -1) {
        tree.splice(index, 1)
        return true
      }
      for (const item of tree) {
        if (item.children && removeFromTree(item.children)) {
          return true
        }
      }
      return false
    }
    
    removeFromTree(componentTree.value)
    
    if (selectedComponentId.value === uid) {
      selectedComponent.value = null
      selectedComponentId.value = null
    }
    
    pushHistory()
  }
  
  // Переместить компонент
  function moveComponent(uid, newParentId, newPosition) {
    // Найти и удалить компонент
    let component = null
    const removeFromTree = (tree) => {
      const index = tree.findIndex(c => c.uid === uid)
      if (index !== -1) {
        component = tree.splice(index, 1)[0]
        return true
      }
      for (const item of tree) {
        if (item.children && removeFromTree(item.children)) {
          return true
        }
      }
      return false
    }
    
    removeFromTree(componentTree.value)
    
    if (!component) return
    
    // Вставить в новое место
    if (newParentId) {
      const parent = findComponentById(componentTree.value, newParentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.splice(newPosition, 0, component)
      }
    } else {
      componentTree.value.splice(newPosition, 0, component)
    }
    
    pushHistory()
  }
  
  // Обновить свойства компонента
  function updateComponent(uid, updates) {
    const component = findComponentById(componentTree.value, uid)
    if (component) {
      Object.assign(component, updates)
      pushHistory()
    }
  }
  
  // Обновить props компонента
  function updateComponentProps(uid, props) {
    const component = findComponentById(componentTree.value, uid)
    if (component) {
      component.props = { ...component.props, ...props }
      pushHistory()
    }
  }
  
  // Найти компонент по uid
  function findComponentById(tree, uid) {
    for (const item of tree) {
      if (item.uid === uid) return item
      if (item.children) {
        const found = findComponentById(item.children, uid)
        if (found) return found
      }
    }
    return null
  }
  
  // Выбрать компонент
  function selectComponent(uid) {
    selectedComponentId.value = uid
    selectedComponent.value = uid ? findComponentById(componentTree.value, uid) : null
  }
  
  // Очистить выбор
  function clearSelection() {
    selectedComponent.value = null
    selectedComponentId.value = null
  }
  
  // История - добавить состояние
  function pushHistory() {
    hasUnsavedChanges.value = true
    
    // Удалить будущие состояния если мы в середине истории
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    
    // Добавить новое состояние
    history.value.push(JSON.stringify(componentTree.value))
    
    // Ограничить размер истории
    if (history.value.length > maxHistorySize) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }
  
  // Отменить
  function undo() {
    if (!canUndo.value) return
    historyIndex.value--
    componentTree.value = JSON.parse(history.value[historyIndex.value])
    hasUnsavedChanges.value = true
  }
  
  // Повторить
  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    componentTree.value = JSON.parse(history.value[historyIndex.value])
    hasUnsavedChanges.value = true
  }
  
  // Сброс
  function reset() {
    currentModule.value = null
    currentPage.value = null
    componentTree.value = []
    selectedComponent.value = null
    selectedComponentId.value = null
    history.value = []
    historyIndex.value = -1
    hasUnsavedChanges.value = false
  }
  
  return {
    // State
    currentModule,
    currentPage,
    componentTree,
    selectedComponent,
    selectedComponentId,
    palette,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    
    // Computed
    canUndo,
    canRedo,
    
    // Actions
    loadModule,
    loadPage,
    loadPalette,
    savePage,
    setAsHomepage,
    addComponent,
    removeComponent,
    moveComponent,
    updateComponent,
    updateComponentProps,
    selectComponent,
    clearSelection,
    findComponentById,
    undo,
    redo,
    reset,
  }
})

