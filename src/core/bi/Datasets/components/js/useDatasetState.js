import { ref, computed} from 'vue'
import { useRoute } from 'vue-router'


export function useDatasetState() {
  const route = useRoute()

  // Основное состояние
  const dataset = ref({})
  const origDatasetRef = ref(null)
  const mainTable = ref(null)
  const allTablesOfConnection = ref([])
  const relations = ref([])
  
  // UI состояние
  const activeTab = ref('sources')
  const isPreviewVisible = ref(true)
  const isPreviewLoading = ref(false)
  const saving = ref(false)
  const saveSuccess = ref(false)
  
  // Данные
  const fields = ref([])
  const selectedTables = ref([])
  const previewCols = ref([])
  const previewRows = ref([])
  // Лимит строк для предпросмотра берется из .env (VITE_BI_PREVIEW_ROWS_LIMIT)
  const previewLimit = ref(parseInt(import.meta.env.VITE_BI_PREVIEW_ROWS_LIMIT || '200', 10))
  
  // Модальные окна
  const showModal = ref(false)
  const showTableLinkModal = ref(false)
  const showDatasetDialog = ref(false)
  const selectedField = ref(null)
  const editingRelation = ref(null)
  const editingRelationIndex = ref(null)
  
  // Подключения
  const selectedConnection = ref(null)
  const fileUploadsCache = ref([])
  
  // Вычисляемые свойства
  const datasetId = computed(() => route.params.id)
  const isNewPage = computed(() => !datasetId.value)
  const currentDatasetId = computed(() => dataset.value?.id)
  
  const headerName = computed(() =>
    dataset.value?.name || 'Новый датасет'
  )
  
  const canCreateDataset = computed(() =>
    isNewPage.value && !!mainTable.value?.id
  )
  
  // Тикер для реактивного пересчёта isDirty при изменении параметров
  const paramsDirtyTick = ref(0)

  const isDirty = computed(() => {
    // зависимости от тикера, чтобы триггерить пересчёт
    void paramsDirtyTick.value
    if (!origDatasetRef.value) return false
    if (selectedConnection.value?.id !== origDatasetRef.value.connection) return true
    if (mainTable.value?.file_id !== origDatasetRef.value.file_source) return true
    
    // Проверяем черновые параметры в sessionStorage и сравниваем с параметрами в БД
    try {
      const storageKey = `bi:dataset:params:${datasetId.value ?? 'new'}`
      const raw = sessionStorage.getItem(storageKey)
      if (raw) {
        const draft = JSON.parse(raw)
        if (Array.isArray(draft)) {
          const origParams = Array.isArray(origDatasetRef.value.params) ? origDatasetRef.value.params : []
          const norm = (arr = []) => arr
            .map(p => ({
              name: String(p.name ?? ''),
              type: String(p.type ?? ''),
              defaultValue: p.defaultValue ?? p.default ?? '',
              sourceUsage: Boolean(p.sourceUsage)
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
          const curStr = JSON.stringify(norm(draft))
          const origStr = JSON.stringify(norm(origParams))
          if (curStr !== origStr) return true
        }
      }
    } catch (e) {
      console.warn('[isDirty] Ошибка при проверке параметров:', e)
    }
    
    const origMain = (origDatasetRef.value.tables || []).find(t => t.order === 0)
    const cur = JSON.stringify(normalizeRelations(relations.value))
    const orig = JSON.stringify(normalizeRelations(getRelationsFromDataset(origDatasetRef.value, origMain ? origMain.id : null)))
    
    if (cur !== orig) return true
    if (isFieldsDirty()) return true
    return false
  })
  
  const usedRightTableIds = computed(() =>
    (relations.value || []).map(r => r.rightTableId)
  )
  
  const computedLinkedTableIds = computed(() => {
    if (editingRelation.value?.rightTableId) {
      return usedRightTableIds.value.filter(
        id => String(id) !== String(editingRelation.value.rightTableId)
      )
    }
    return usedRightTableIds.value
  })
  
  // Функции
  function normalizeRelations(rels = []) {
    const normalized = rels
      .map(({ rightTableId, joinType, lines = [] }) => ({
        rightTableId: String(rightTableId),
        joinType: String(joinType),
        lines: lines
          .map(({ left, right }) => ({
            left: String(left),
            right: String(right)
          }))
          .sort((a, b) => (a.left + a.right).localeCompare(b.left + b.right))
      }))
      .sort((a, b) => a.rightTableId.localeCompare(b.rightTableId))
    
    return normalized
  }
  
  function isFieldsDirty() {
    if (!origDatasetRef.value || !Array.isArray(origDatasetRef.value.fields)) {
      return false
    }
    
    // Если в origDatasetRef есть поля, а текущие fields пусты - возможно данные еще загружаются
    // В этом случае не считаем это изменением
    if (origDatasetRef.value.fields.length > 0 && fields.value.length === 0) {
      return false
    }
    
    // Нормализуем значения для сравнения
    const normalize = (val) => {
      if (val === null || val === undefined) return ''
      return String(val).trim()
    }
    
    const keysToCheck = ['name', 'aggregation', 'type', 'description']
    
    // Создаем карту текущих полей по имени
    const curMap = new Map(fields.value.filter(f => f.name).map(f => [f.name, f]))
    
    // Проверяем ТОЛЬКО поля из оригинала
    // Новые поля из связанных таблиц не считаются изменением
    for (const origField of origDatasetRef.value.fields) {
      if (!origField.name) continue
      
      const curField = curMap.get(origField.name)
      
      // Если поле из оригинала отсутствует в текущих полях - это изменение
      if (!curField) {
        return true
      }
      
      // Сравниваем свойства поля
      for (const key of keysToCheck) {
        const curVal = normalize(curField[key])
        const origVal = normalize(origField[key])
        if (curVal !== origVal) {
          return true
        }
      }
    }
    
    return false
  }
  
  function getRelationsFromDataset(ds, mainTableId) {
    const relationsMap = new Map()
    ;(ds.tables || [])
      .filter(t => t.id !== mainTableId && t.joined_on_type && t.joined_on_left && t.joined_on_right)
      .forEach(t => {
        const rightTableId = t.id
        const line = { left: t.joined_on_left, right: t.joined_on_right }
        
        if (relationsMap.has(rightTableId)) {
          const existing = relationsMap.get(rightTableId)
          if (!existing.lines.some(l => l.left === line.left && l.right === line.right)) {
            existing.lines.push(line)
          }
        } else {
          relationsMap.set(rightTableId, {
            rightTableId: rightTableId,
            joinType: t.joined_on_type?.toLowerCase(),
            lines: [line]
          })
        }
      })
    
    return Array.from(relationsMap.values())
  }
  
  function needsDataset(tab) {
    return tab === 'fields' || tab === 'params'
  }
  
  function tabLabel(tab) {
    return tab === 'fields' ? 'поля' : (tab === 'params' ? 'параметры' : '')
  }
  
  function getTabComponent(tab) {
    const cmp = { fields: 'FieldsPage', params: 'ParamsPage' }[tab] || null
    return cmp
  }
  
  // Экспортируем все необходимые переменные и функции
  return {
    // Состояние
    dataset,
    origDatasetRef,
    mainTable,
    allTablesOfConnection,
    relations,
    activeTab,
    isPreviewVisible,
    isPreviewLoading,
    saving,
    saveSuccess,
    fields,
    selectedTables,
    previewCols,
    previewRows,
    previewLimit,
    showModal,
    showTableLinkModal,
    showDatasetDialog,
    selectedField,
    editingRelation,
    editingRelationIndex,
    selectedConnection,
    fileUploadsCache,
    
    // Вычисляемые свойства
    datasetId,
    isNewPage,
    currentDatasetId,
    headerName,
    canCreateDataset,
    isDirty,
    paramsDirtyTick,
    usedRightTableIds,
    computedLinkedTableIds,
    
    // Функции
    normalizeRelations,
    isFieldsDirty,
    getRelationsFromDataset,
    needsDataset,
    tabLabel,
    getTabComponent
  }
}


