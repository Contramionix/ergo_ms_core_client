<template>
  <div class="table-link-content">
    <div class="body">
      <div class="body-label body-label-sheet">
        <div>Таблица:</div>
        <SelectBox
          v-model="selectedTableId"
          :options="availableTables"
          value-key="id"
          label-key="display_name"
          :include-all-option="false"
          :cast-to-number="true"
          :current-label-formatter="formatTableName"
        />
      </div>
      <div class="body-label">
        <div>Тип связи:</div>
        <SelectBox
          v-model="joinType"
          :options="joinTypeOptions"
          :include-all-option="false"
          value-key="value"
          label-key="label"
        />
      </div>
      <div v-for="(line, idx) in relationLines" v-if="relationLines.length" :key="idx" class="body-line">
        <SelectBox
          v-model="line.left"
          :options="mainTableColumns.map(col => ({ value: col, label: col }))"
          :include-all-option="false"
          value-key="value"
          label-key="label"
        />
        <div>=</div>
        <SelectBox
          v-model="line.right"
          :options="linkedTableColumns.map(col => ({ value: col, label: col }))"
          :include-all-option="false"
          value-key="value"
          label-key="label"
        />
        <button type="button" class="btn-remove" aria-label="Удалить связь" @click="removeRelationLine(idx)">
          <div class="icon-button">
            <Trash2 size="29" />
          </div>
        </button>
      </div>
      <div class="body-line-button">
        <button class="btn btn-primary mx-auto" @click="addRelationLine" :disabled="!selectedTableId">Добавить
          связь</button>
      </div>
    </div>
    <div class="footer">
      <div class="footer-buttons">
        <div class="footer-buttons">
          <button class="btn btn-primary" @click="handleAutoJoinAndApply" :disabled="isJoinLoading || !canApply">
            <template v-if="isJoinLoading">
              <Loader :size="20" class="icon-loading" />Проверка...
            </template>
            <template v-else>
              Применить
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Trash2, Loader } from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'

const joinType = ref('inner')
const relationLines  = ref([])
const isJoinLoading = ref(false)
const joinError = ref(null)

const emit = defineEmits(['close', 'apply', 'selectTable'])

const props = defineProps({
  allTables: Array,
  mainTable: Object,
  linkedTableIds: { type: Array, default: () => [] },
  editRelation: Object,
  datasetId: [String, Number],
  selectedConnection: Object,
})

const canApply = computed(() => {
  // Проверяем, что выбрана таблица и она доступна
  if (!selectedTableId.value) {
    return false
  }
  
  const selectedTable = props.allTables.find(t => t.id === selectedTableId.value)
  if (!selectedTable) {
    return false
  }
  
  // Проверяем, что выбранная таблица принадлежит текущему подключению
  if (props.selectedConnection) {
    let belongsToCurrentConnection = false
    
    if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
        props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
      belongsToCurrentConnection = selectedTable.file_id === props.selectedConnection.id
    } else {
      belongsToCurrentConnection = !selectedTable.connection_id || selectedTable.connection_id === props.selectedConnection.id
    }
    
    if (!belongsToCurrentConnection) {
      return false
    }
  }
  
  const hasLines = relationLines.value.length > 0
  const allLinesComplete = relationLines.value.every(line => line.left && line.right)
  
  const result = hasLines && allLinesComplete
  
  return result
})

const isEditMode = computed(() => {
  const hasEditRelation = !!props.editRelation
  return hasEditRelation
})
const selectedTableId = ref(() => {
  if (isEditMode.value && props.editRelation?.rightTableId) {
    const tableId = Number(props.editRelation.rightTableId)
    return tableId
  }
  
  return null
})
  
const linkedTable = computed(() => {
  if (!selectedTableId.value) {
    return null
  }
  
  const table = props.allTables.find(t => t.id === selectedTableId.value)
  if (!table) {
    return null
  }
  
  return table
})

const mainTableColumns = ref([])
const linkedTableColumns = ref([])

// Инициализируем колонки главной таблицы
if (props.mainTable) {
  mainTableColumns.value = getTableColumns(props.mainTable)
} else {
}

// Делаем эти переменные реактивными computed свойствами
const usedStagingIds = computed(() => {
  const ids = props.linkedTableIds || []
  return ids
})

const usedFileIds = computed(() => {
  const fileIds = props.allTables
    .filter(t => usedStagingIds.value.includes(t.id))
    .map(t => t.file_id)
  
  return fileIds
})

const availableTables = computed(() => {
  if (!props.mainTable || !props.selectedConnection) {
    return [];
  }
  
  const filteredTables = props.allTables.filter(t => {
    // Строгая проверка принадлежности к текущему подключению
    let belongsToCurrentConnection = false
    
    if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
        props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
      // Для файловых подключений проверяем file_id
      belongsToCurrentConnection = t.file_id === props.selectedConnection.id
    } else {
      // Для базовых подключений проверяем connection_id
      belongsToCurrentConnection = t.connection_id === props.selectedConnection.id
    }
    
    if (!belongsToCurrentConnection) {
      return false
    }
    
    // Исключаем главную таблицу
    if (t.id === props.mainTable.id) {
      return false;
    }
    
    // Исключаем таблицы, помеченные как главные
    if (t.isMain) {
      return false;
    }
    
    // Исключаем таблицы из того же файла, что и главная таблица
    if (t.file_id && t.file_id === props.mainTable.file_id) {
      return false;
    }
    
    // Исключаем уже использованные таблицы (кроме редактируемой)
    if (isEditMode.value && props.editRelation?.rightTableId) {
      // В режиме редактирования исключаем все использованные таблицы кроме текущей редактируемой
      if (usedStagingIds.value.includes(t.id) && t.id !== props.editRelation.rightTableId) {
        return false;
      }
    } else {
      // В обычном режиме исключаем все использованные таблицы
      if (usedStagingIds.value.includes(t.id)) {
        return false;
      }
    }
    
    // Исключаем файлы, которые уже используются (кроме редактируемой)
    if (t.file_id && usedFileIds.value.includes(t.file_id)) {
      if (isEditMode.value && props.editRelation?.rightTableId && t.id === props.editRelation.rightTableId) {
        // Разрешаем файл редактируемой таблицы
      } else {
        return false;
      }
    }
    
    // Исключаем таблицы без file_upload_id и file_id
    if (t.file_upload_id == null && t.file_id == null) {
      return false;
    }
    
    return true;
  });
  
  return filteredTables;
});

const joinTypeOptions = [
  { value: 'inner', label: 'INNER JOIN' },
  { value: 'left', label: 'LEFT JOIN' },
  { value: 'right', label: 'RIGHT JOIN' },
  { value: 'full', label: 'FULL JOIN' }
]

function formatTableName({ option }) {
  return getTableName(option)
}

function getTableName(table) {
  if (!table) {
    return 'Неизвестно';
  }
  
  const file = table.file_upload || {};
  let name = table.display_name || table.table_name || table.name || 'Неизвестная таблица';
  
  if (file.sheet_name) {
    name += ` (${file.sheet_name})`;
  }
  
  if (file.original_filename) {
    name += ` [${file.original_filename}]`;
  }
  
  if (!file.original_filename && table.file_upload_name) {
    name = table.file_upload_name;
  }
  
  return name;
}

function removeRelationLine(idx) {
  if (idx >= 0 && idx < relationLines.value.length) {
    relationLines.value.splice(idx, 1)
  }
}
function addRelationLine() {
  // Проверяем, что выбрана доступная таблица
  if (!selectedTableId.value) {
    return
  }
  
  const selectedTable = props.allTables.find(t => t.id === selectedTableId.value)
  if (!selectedTable) {
    return
  }
  
  // Проверяем принадлежность к текущему подключению
  if (props.selectedConnection) {
    let belongsToCurrentConnection = false
    
    if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
        props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
      belongsToCurrentConnection = selectedTable.file_id === props.selectedConnection.id
    } else {
      belongsToCurrentConnection = !selectedTable.connection_id || selectedTable.connection_id === props.selectedConnection.id
    }
    
    if (!belongsToCurrentConnection) {
      return
    }
  }
  
  relationLines.value.push({ left: null, right: null })
}

function getTableColumns(table) {
  if (!table) {
    return []
  }
  
  // Если у таблицы нет columns_info, но есть file_id, ищем backup
  if (!table?.columns_info && table?.file_id) {
    const backup = props.allTables.find(f => f.id === -table.file_id)
    if (backup?.columns_info) {
      table.columns_info = backup.columns_info
    }
  }

  // Проверяем, что columns_info существует и содержит columns
  if (!table?.columns_info?.columns) {
    return []
  }

  const columns = table.columns_info.columns
  return columns
}

async function handleAutoJoinAndApply() {
  isJoinLoading.value = true
  joinError.value = null

  try {
    const linkedTable = props.allTables.find(t => t.id === selectedTableId.value)
    if (!linkedTable) {
      throw new Error('Таблица не выбрана')
    }
    
    // Дополнительная проверка, что выбранная таблица принадлежит текущему подключению
    if (props.selectedConnection) {
      let belongsToCurrentConnection = false
      
      if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
          props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
        belongsToCurrentConnection = linkedTable.file_id === props.selectedConnection.id
      } else {
        belongsToCurrentConnection = !linkedTable.connection_id || linkedTable.connection_id === props.selectedConnection.id
      }
      
      if (!belongsToCurrentConnection) {
        throw new Error('Выбранная таблица не принадлежит текущему подключению')
      }
    }
    
    if (!relationLines.value.length) {
      throw new Error('Не выбрана пара полей для связи')
    }
    
    const mainLine = relationLines.value[0]
    if (!mainLine.left || !mainLine.right) {
      throw new Error('Выберите оба поля для связи')
    }

    const lines = relationLines.value.map(line => ({
      left: line.left,
      right: line.right
    }));

    const rightTableId = linkedTable.id

    emit('apply', {
      leftTableId: props.mainTable.id,
      rightTableId,
      joinType: joinType.value,
      lines
    });
    
    emit('close');
  } catch (e) {
    joinError.value = e.message || 'Ошибка соединения';
  } finally {
    isJoinLoading.value = false
  }
}

watch(selectedTableId, (newId, oldId) => {
  if (newId) {
    const tbl = props.allTables.find(t => t.id === newId)
    if (!tbl) {
      selectedTableId.value = null
      return
    }
    
    // Проверяем, что выбранная таблица принадлежит текущему подключению
    if (props.selectedConnection) {
      let belongsToCurrentConnection = false
      
      if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
          props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
        belongsToCurrentConnection = tbl.file_id === props.selectedConnection.id
      } else {
        belongsToCurrentConnection = !tbl.connection_id || tbl.connection_id === props.selectedConnection.id
      }
      
      if (!belongsToCurrentConnection) {
        selectedTableId.value = null
        return
      }
    }
    
    linkedTableColumns.value = getTableColumns(tbl)
    if (!isEditMode.value) relationLines.value = []
  } else {
    linkedTableColumns.value = []
    if (!isEditMode.value) relationLines.value = []
  }
})

watch(
  () => props.mainTable,
  (tbl, oldTbl) => {
    if (tbl) {
      mainTableColumns.value = getTableColumns(tbl)
      
      // Проверяем, что выбранная таблица для связи совместима с новой главной таблицей
      if (selectedTableId.value && oldTbl && tbl.id !== oldTbl.id) {
        const selectedTable = props.allTables.find(t => t.id === selectedTableId.value)
        if (selectedTable) {
          // Проверяем, что выбранная таблица не является главной таблицей
          if (selectedTable.id === tbl.id) {
            selectedTableId.value = null
            relationLines.value = []
            joinType.value = 'inner'
          }
          // Проверяем, что таблицы не из одного файла
          else if (selectedTable.file_id && selectedTable.file_id === tbl.file_id) {
            selectedTableId.value = null
            relationLines.value = []
            joinType.value = 'inner'
          }
          // Проверяем принадлежность к текущему подключению
          else if (props.selectedConnection) {
            let belongsToCurrentConnection = false
            
            if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
                props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
              belongsToCurrentConnection = selectedTable.file_id === props.selectedConnection.id
            } else {
              belongsToCurrentConnection = !selectedTable.connection_id || selectedTable.connection_id === props.selectedConnection.id
            }
            
            if (!belongsToCurrentConnection) {
              selectedTableId.value = null
              relationLines.value = []
              joinType.value = 'inner'
            }
          }
        }
      }
    } else {
      mainTableColumns.value = []
      // Если главная таблица удалена, сбрасываем выбранную таблицу связи
      selectedTableId.value = null
      relationLines.value = []
      joinType.value = 'inner'
    }
  },
  { immediate: true }
)

watch(linkedTable, (tbl, oldTbl) => {
  if (tbl) {
    linkedTableColumns.value = getTableColumns(tbl)
  } else {
    linkedTableColumns.value = []
  }
}, { immediate: true })

watch(
   () => props.editRelation,
   (rel, oldRel) => {
     if (!rel) {
      joinType.value      = 'inner'
      relationLines.value = []
      selectedTableId.value = null
      return
     }
     
     // Проверяем, что редактируемая таблица доступна в текущем подключении
     const rightTable = props.allTables.find(t => t.id === rel.rightTableId)
     if (!rightTable) {
       // Таблица не найдена в списке доступных таблиц
       joinType.value = 'inner'
       relationLines.value = []
       selectedTableId.value = null
       return
     }
     
     // Проверяем принадлежность к текущему подключению
     if (props.selectedConnection) {
       let belongsToCurrentConnection = false
       
       if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
           props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
         belongsToCurrentConnection = rightTable.file_id === props.selectedConnection.id
       } else {
         belongsToCurrentConnection = !rightTable.connection_id || rightTable.connection_id === props.selectedConnection.id
       }
       
       if (!belongsToCurrentConnection) {
         // Таблица не принадлежит текущему подключению
         joinType.value = 'inner'
         relationLines.value = []
         selectedTableId.value = null
         return
       }
     }
     
     // Дополнительная проверка - таблица должна быть в списке доступных таблиц
     const isAvailable = props.allTables.some(t => {
       if (t.id !== rel.rightTableId) return false
       
       // Исключаем главную таблицу
       if (props.mainTable && t.id === props.mainTable.id) return false
       
       // Исключаем таблицы из того же файла, что и главная таблица
       if (props.mainTable && t.file_id && t.file_id === props.mainTable.file_id) return false
       
       // Исключаем таблицы без file_upload_id и file_id
       if (t.file_upload_id == null && t.file_id == null) return false
       
       return true
     })
     
     if (!isAvailable) {
       // Таблица недоступна для связи
       joinType.value = 'inner'
       relationLines.value = []
       selectedTableId.value = null
       return
     }
     
     // Все проверки пройдены, устанавливаем данные связи
     selectedTableId.value = Number(rel.rightTableId)
     joinType.value = (rel.joinType || 'INNER JOIN')
                     .split(' ')[0]
                     .toLowerCase()
     relationLines.value   = rel.lines?.length
       ? rel.lines.map(l => ({ left: l.left,  right: l.right }))
       : [{ left: rel.leftColumn, right: rel.rightColumn }]
   },
   { immediate: true }
)

// Добавляем watch для изменения подключения
watch(
  () => props.selectedConnection,
  (newConnection, oldConnection) => {
    if (newConnection && oldConnection && newConnection.id !== oldConnection.id) {
      // Сбрасываем выбранную таблицу при смене подключения
      selectedTableId.value = null
      // Сбрасываем связи
      relationLines.value = []
      // Сбрасываем тип соединения на значение по умолчанию
      joinType.value = 'inner'
    } else if (newConnection && selectedTableId.value) {
      // Проверяем, что текущая выбранная таблица принадлежит новому подключению
      const selectedTable = props.allTables.find(t => t.id === selectedTableId.value)
      if (selectedTable) {
        let belongsToCurrentConnection = false
        
        if (newConnection.connector_type_display?.toLowerCase().includes('file') || 
            newConnection.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = selectedTable.file_id === newConnection.id
        } else {
          belongsToCurrentConnection = !selectedTable.connection_id || selectedTable.connection_id === newConnection.id
        }
        
        if (!belongsToCurrentConnection) {
          // Таблица не принадлежит текущему подключению, сбрасываем
          selectedTableId.value = null
          relationLines.value = []
          joinType.value = 'inner'
        }
      }
    }
  }
)

// Добавляем watch для изменения списка таблиц
watch(
  () => props.allTables,
  (newTables, oldTables) => {
    if (selectedTableId.value && newTables) {
      // Проверяем, доступна ли выбранная таблица в новом списке
      const selectedTable = newTables.find(t => t.id === selectedTableId.value)
      
      if (!selectedTable) {
        // Таблица не найдена в списке
        selectedTableId.value = null
        relationLines.value = []
        joinType.value = 'inner'
        return
      }
      
      // Проверяем принадлежность к текущему подключению
      if (props.selectedConnection) {
        let belongsToCurrentConnection = false
        
        if (props.selectedConnection.connector_type_display?.toLowerCase().includes('file') || 
            props.selectedConnection.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = selectedTable.file_id === props.selectedConnection.id
        } else {
          belongsToCurrentConnection = selectedTable.connection_id === props.selectedConnection.id
        }
        
        if (!belongsToCurrentConnection) {
          // Таблица не принадлежит текущему подключению
          selectedTableId.value = null
          relationLines.value = []
          joinType.value = 'inner'
          return
        }
      }
      
      // Проверяем доступность в списке availableTables
      const isAvailable = availableTables.value.some(t => t.id === selectedTableId.value)
      if (!isAvailable) {
        selectedTableId.value = null
        relationLines.value = []
        joinType.value = 'inner'
      }
    }
  },
  { deep: true }
)

// Добавляем watch для изменения доступных таблиц
watch(
  availableTables,
  (newAvailableTables) => {
    // Если есть выбранная таблица, но её нет в списке доступных
    if (selectedTableId.value && !newAvailableTables.some(t => t.id === selectedTableId.value)) {
      selectedTableId.value = null
      relationLines.value = []
      joinType.value = 'inner'
    }
  }
)
</script>

<style scoped lang="scss">
.table-link-content {
  display: flex;
  flex-direction: column;
  padding: 15px 15px 0 15px;
  height: 100%;
  width: 100%;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 10px 10px 0 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.body-label {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 10px;
}

.body-label > div:first-child {
  flex-shrink: 0;
  min-width: 100px;
}

.body-label .select-box {
  flex: 1;
  min-width: 0;
}

.body-line {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: space-between;
  gap: 10px;
}

.body-line .select-box {
  flex: 1;
  min-width: 0;
}

.body-line > div:not(.select-box) {
  flex-shrink: 0;
}

.footer {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 15px;
  padding-top: 20px;
  flex-shrink: 0;
}

.footer-buttons {
  display: flex;
  gap: 10px;
}

.btn-remove {
  background: transparent;
  border: none;
  outline: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 4px;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
}

.btn-remove .icon-button svg {
  color: var(--color-secondary-text);
  transition: color 0.15s;
}

.btn-remove:hover .icon-button svg,
.btn-remove:focus-visible .icon-button svg {
  color: var(--color-accent);
}

.body-line-button {
  padding-top: 20px;
}
</style>