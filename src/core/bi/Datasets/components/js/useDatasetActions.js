import { useRouter } from 'vue-router'
import datasetService from '@/core/bi/MainPage/Sidebar/components/js/datasetService'
import connectionService from '@/core/bi/MainPage/Sidebar/components/js/connectionService'

export function useDatasetActions(state) {
  const router = useRouter()
  
  function getCachedParamsKey(id) {
    const keyId = (id === null || id === undefined) ? 'new' : String(id)
    return `bi:dataset:params:${keyId}`
  }
  
  function readCachedParams(id) {
    try {
      const raw = sessionStorage.getItem(getCachedParamsKey(id))
      if (!raw) return undefined
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
      return undefined
    } catch (e) {
      console.warn('[useDatasetActions] failed to read cached params', e)
      return undefined
    }
  }
  
  function clearCachedParams(id) {
    try { sessionStorage.removeItem(getCachedParamsKey(id)) } catch (e) {
      console.warn('[useDatasetActions] failed to clear cached params', e)
    }
  }
  
  // Вспомогательная функция для синхронизации полей из сохраненного датасета
  function syncFieldsFromDataset(datasetFields) {
    if (Array.isArray(datasetFields) && datasetFields.length > 0) {
      state.fields.value = datasetFields.map(f => ({
        id: f.id,
        name: f.name || f.source_column || '',
        aggregation: f.aggregation || 'none',
        type: f.type || 'string',
        description: f.description || '',
        source: f.source || (f.source_column ? { column: f.source_column } : {}),
        source_table: f.source_table || null,
        expression: f.expression || null
      }))
      
      // Формируем previewCols из полей датасета в правильном порядке
      state.previewCols.value = datasetFields
        .map(f => f.name)
        .filter(Boolean)
    } else {
      // Если полей нет, очищаем массив и preview
      state.fields.value = []
      state.previewCols.value = []
      state.previewRows.value = []
    }
  }
  
  // Вспомогательная функция для подготовки полей для отправки на сервер (для обновления)
  function prepareFieldsForUpdate(fields) {
    return fields
      .filter(f => f.name)
      .map(f => {
        // Извлекаем ID source_table, если это объект
        let source_table_id = null
        if (f.source_table) {
          if (typeof f.source_table === 'number' || typeof f.source_table === 'string') {
            source_table_id = f.source_table
          } else if (f.source_table?.id) {
            source_table_id = f.source_table.id
          }
        }
        
        return {
          id: (typeof f.id === 'number' || (typeof f.id === 'string' && !f.id.toString().startsWith('new_'))) ? f.id : undefined,
          name: f.name,
          aggregation: f.aggregation,
          type: f.type || 'string',
          description: f.description || '',
          source_column: f.source?.column,
          source_table: source_table_id,
        }
      })
  }
  
  // Функции для работы с датасетом
  async function saveDataset(finalName) {
    state.saving.value = true
    try {
      let dsId = state.dataset.value?.id

      const fieldsAgg = state.fields.value
        .filter(f => f.name)
        .map(f => ({
          name: f.name,
          aggregation: f.aggregation,
          type: f.type || 'string'
        }))

      if (!dsId) {
        const payload = {
          name: finalName,
          description: state.dataset.value?.description || '',
          connection: state.selectedConnection.value?.id || null,
          file_source: state.mainTable.value?.file_id || null,
          table_ref: state.mainTable.value?.table_ref || null,
          fields: fieldsAgg.length ? fieldsAgg : undefined,
          params: readCachedParams(null)
        }
        
        const res = await datasetService.createDataset(payload)
        if (!res?.data?.id) throw new Error('Ошибка при создании датасета')
        dsId = res.data.id
        
        // Переносим кэш параметров под новый id
        const newKey = getCachedParamsKey(dsId)
        const oldKey = getCachedParamsKey(null)
        try {
          const raw = sessionStorage.getItem(oldKey)
          if (raw) {
            sessionStorage.setItem(newKey, raw)
            sessionStorage.removeItem(oldKey)
          }
        } catch (e) {
          console.warn('[useDatasetActions] Не удалось перенести кэш параметров:', e)
        }
        
        for (const rel of state.relations.value) {
          const tableObj = state.allTablesOfConnection.value.find(
            t => Number(t.id) === Number(rel.rightTableId)
          )
          const relationPayload = {
            datasetId: dsId,
            rightTableId: rel.rightTableId,
            joinType: rel.joinType,
            lines: rel.lines,
          }
          if (tableObj?.file_id) relationPayload.file_id = tableObj.file_id
          
          await datasetService.addRelation(relationPayload)
        }
        
        const { data: updated } = await datasetService.getDataset(dsId)
        state.dataset.value = updated
        // Обновляем origDatasetRef, чтобы isDirty корректно определял изменения после создания
        state.origDatasetRef.value = JSON.parse(JSON.stringify(updated))
        
        // Синхронизируем данные датасета, включая поля
        await hydrateFromDataset(updated)
        state.relations.value = state.getRelationsFromDataset(updated, state.mainTable.value?.id)
        
        // Загружаем предпросмотр
        if (state.mainTable.value) {
          await loadPreview()
          
          // Синхронизируем поля напрямую из сохраненного датасета
          syncFieldsFromDataset(state.origDatasetRef.value?.fields)
        }
        
        // Синхронизируем кэш параметров с БД, чтобы черновик соответствовал сохранённому состоянию
        try {
          const key = getCachedParamsKey(dsId)
          const paramsFromDb = Array.isArray(updated.params) ? updated.params : []
          sessionStorage.setItem(key, JSON.stringify(paramsFromDb))
        } catch (e) { console.warn('[useDatasetActions] failed to sync params cache after create', e) }
      } else {
        // Для существующего датасета должен вызываться editDataset
        // Если это не так, вызываем editDataset для безопасности
        await editDataset(finalName)
        return
      }

      router.replace({ name: 'DatasetPage', params: { id: dsId } })
    } catch (error) {
      console.error('[useDatasetActions] Ошибка при сохранении датасета:', error)
      throw error
    } finally {
      state.saving.value = false
    }
  }
  
  async function editDataset(finalName = state.dataset.value?.name) {
    state.saving.value = true
    state.saveSuccess.value = false
    try {
      if (!state.dataset.value?.id) return
      
      const dsId = state.dataset.value.id
      let datasetName = finalName
      
      if (typeof datasetName === 'object' && datasetName !== null) {
        if ('name' in datasetName) {
          datasetName = datasetName.name
        } else if ('target' in datasetName && typeof datasetName.target.value === 'string') {
          datasetName = datasetName.target.value
        } else {
          datasetName = undefined
        }
      }

      const fieldsAgg = prepareFieldsForUpdate(state.fields.value)

      const patch = {}
      if (state.selectedConnection.value?.id !== state.origDatasetRef.value.connection)
        patch.connection = state.selectedConnection.value.id
      if (state.mainTable.value?.file_id !== state.origDatasetRef.value.file_source) {
        patch.file_source = state.mainTable.value.file_id
        patch.table_ref = state.mainTable.value.table_ref
      }
      if (datasetName && datasetName !== state.origDatasetRef.value.name)
        patch.name = datasetName

      // Проверяем, изменились ли поля по сравнению с оригинальными
      const origFields = (state.origDatasetRef.value?.fields || []).map(f => ({
        id: f.id,
        name: f.name,
        aggregation: f.aggregation || 'none',
        type: f.type || 'string',
        description: f.description || '',
        source_column: f.source_column || f.source?.column,
      }))
      
      const currentFields = fieldsAgg.map(f => ({
        id: f.id,
        name: f.name,
        aggregation: f.aggregation || 'none',
        type: f.type || 'string',
        description: f.description || '',
        source_column: f.source_column,
      }))
      
      // Сравниваем поля (без учета порядка, только по id и name)
      const origFieldsMap = new Map(origFields.map(f => [f.id || f.name, f]))
      const currentFieldsMap = new Map(currentFields.map(f => [f.id || f.name, f]))
      
      const fieldsChanged = 
        origFields.length !== currentFields.length ||
        origFields.some(f => {
          const current = currentFieldsMap.get(f.id || f.name)
          return !current || 
            current.name !== f.name ||
            current.aggregation !== f.aggregation ||
            current.type !== f.type ||
            current.description !== f.description ||
            current.source_column !== f.source_column
        }) ||
        currentFields.some(f => {
          const orig = origFieldsMap.get(f.id || f.name)
          return !orig ||
            orig.name !== f.name ||
            orig.aggregation !== f.aggregation ||
            orig.type !== f.type ||
            orig.description !== f.description ||
            orig.source_column !== f.source_column
        })

      // Всегда отправляем fields, если они изменились (включая удаление всех полей)
      if (fieldsChanged) {
        patch.fields = fieldsAgg
      }

      // Подхватываем черновые параметры из sessionStorage
      const paramsDraft = readCachedParams(dsId)
      // Всегда передаём массив параметров, даже пустой (позволяет удалять все параметры)
      if (Array.isArray(paramsDraft)) {
        patch.params = paramsDraft
      }

      if (Object.keys(patch).length) {
        await datasetService.updateDataset(dsId, patch)
      }

      const origMain = (state.origDatasetRef.value.tables || []).find(t => t.order === 0)
      const origMap = new Map(state.getRelationsFromDataset(state.origDatasetRef.value, origMain ? origMain.id : null).map(r => [String(r.rightTableId), r]))
      const curMap = new Map(state.relations.value.map(r => [String(r.rightTableId), r]))

      for (const [id, rel] of curMap) {
        const orig = origMap.get(id)
        if (
          orig &&
          orig.joinType === rel.joinType &&
          JSON.stringify(orig.lines) === JSON.stringify(rel.lines)
        ) {
          continue
        }
        const tableObj = state.allTablesOfConnection.value.find(
          t => Number(t.id) === Number(rel.rightTableId)
        )
        const relationPayload = {
          datasetId: state.dataset.value.id,
          rightTableId: rel.rightTableId,
          joinType: rel.joinType,
          lines: rel.lines,
        }
        if (tableObj?.file_id) relationPayload.file_id = tableObj.file_id

        await datasetService.addRelation(relationPayload)
      }

      const origMainId = origMain ? String(origMain.id) : null
      for (const id of origMap.keys()) {
        if (id === origMainId) continue
        if (!curMap.has(id)) {
          await datasetService.removeRelation({ datasetId: dsId, rightTableId: id })
        }
      }

      const { data: fresh } = await datasetService.getDataset(dsId)
      
      // Загружаем файлы подключения только если connection существует
      if (fresh.connection) {
        try {
          const { data: files } = await connectionService.getFiles(fresh.connection)
          state.fileUploadsCache.value = files
        } catch (error) {
          console.warn('[useDatasetActions] Не удалось загрузить файлы подключения:', error)
          state.fileUploadsCache.value = []
        }
      } else {
        state.fileUploadsCache.value = []
      }
      
      await hydrateFromDataset(fresh)
      state.relations.value = state.getRelationsFromDataset(fresh, state.mainTable.value?.id)
      state.dataset.value = fresh
      state.origDatasetRef.value = JSON.parse(JSON.stringify(fresh))
      
      // Загружаем предпросмотр и синхронизируем поля
      if (state.mainTable.value) {
        await loadPreview()
        
        // Синхронизируем поля напрямую из origDatasetRef (после сохранения на сервере)
        syncFieldsFromDataset(state.origDatasetRef.value?.fields)
      }
      
      state.saveSuccess.value = true
      setTimeout(() => state.saveSuccess.value = false, 1000)

      // Дёргаем тикер грязности, чтобы пересчитать isDirty
      if (state.paramsDirtyTick) state.paramsDirtyTick.value++
      // Синхронизируем кэш параметров с БД, чтобы черновик соответствовал сохранённому состоянию
      try {
        const key = getCachedParamsKey(dsId)
        const paramsFromDb = Array.isArray(fresh.params) ? fresh.params : []
        sessionStorage.setItem(key, JSON.stringify(paramsFromDb))
      } catch (e) { console.warn('[useDatasetActions] failed to sync params cache after edit', e) }
    } finally {
      state.saving.value = false
    }
  }
  
  async function safeUpdateDataset(promise) {
    try {
      const resp = await promise
      const payload = resp && resp.data ? resp.data : resp

      let ok = false
      let ds = null
      if (payload && typeof payload === 'object') {
        if ('success' in payload) {
          ok = payload.success
          ds = payload.dataset ?? payload.data
        } else if ('id' in payload) {
          ok = true
          ds = payload
        }
      }

      if (!ok || !ds?.id) {
        if (payload?.error) console.error('[useDatasetActions] Ошибка в safeUpdateDataset:', payload.error)
        return false
      }

      state.dataset.value = ds
      
      if (Array.isArray(ds.tables) && ds.tables.length) {
        await hydrateFromDataset(ds)
        const validTables = ds.tables.map(mapTable).filter(Boolean)
        state.selectedTables.value = validTables
        buildAllTables()
      } else {
        await loadDataset(ds.id)
      }
      
      return true
    } catch (err) {
      console.error('[useDatasetActions] Исключение в safeUpdateDataset:', err)
      return false
    }
  }
  
  async function loadDataset(id) {
    const { data } = await datasetService.getDataset(id)
    state.dataset.value = data
    
    // Синхронизируем кэш параметров из БД при загрузке датасета,
    // чтобы после перезагрузки страницы параметры были доступны как черновик
    try {
      const key = getCachedParamsKey(id)
      const paramsFromDb = Array.isArray(data.params) ? data.params : []
      sessionStorage.setItem(key, JSON.stringify(paramsFromDb))
    } catch (e) {
      console.warn('[useDatasetActions] failed to sync params cache on loadDataset', e)
    }
    
    const validTables = data.tables.map(mapTable).filter(Boolean)
    state.selectedTables.value = validTables
    
    buildAllTables()
    await hydrateFromDataset(data)
    
    // Загружаем поля напрямую из данных датасета, если они есть
    // Это должно происходить до loadPreview, чтобы поля были доступны сразу
    if (Array.isArray(data.fields) && data.fields.length > 0) {
      state.fields.value = data.fields.map(f => ({
        id: f.id,
        name: f.name || f.source_column || '',
        aggregation: f.aggregation || 'none',
        type: f.type || 'string',
        description: f.description || '',
        source: f.source || (f.source_column ? { column: f.source_column } : {}),
        source_table: f.source_table || null,
        expression: f.expression || null
      }))
    }
    
    await loadPreview()
    
    // Дополнительная синхронизация полей после загрузки preview, если preview содержит данные
    // Это позволяет обновить source_table из preview, если они отличаются
    if (Array.isArray(data.fields) && data.fields.length > 0 && state.previewCols.value.length && state.previewRows.value.length) {
      const origFieldsMap = new Map(data.fields.map(f => [f.name || f.source_column, f]))
      state.fields.value = state.fields.value.map(f => {
        const orig = origFieldsMap.get(f.name) || origFieldsMap.get(f.source?.column)
        if (orig) {
          // Сохраняем source_table из preview, если он есть
          const tableObj = state.selectedTables.value.find(t => 
            t.id === f.source_table?.id || 
            t.display_name === f.source_table?.display_name ||
            t.name === f.source_table?.name
          ) || f.source_table
          
          return {
            ...f,
            name: orig.name || f.name,
            aggregation: orig.aggregation || f.aggregation || 'none',
            type: orig.type || f.type || 'string',
            description: orig.description || f.description || '',
            source_table: tableObj
          }
        }
        return f
      })
    }
    
    // Устанавливаем origDatasetRef ПОСЛЕ полной синхронизации всех данных (relations и fields),
    // чтобы isDirty не считал датасет измененным при начальной загрузке
    // ВАЖНО: origDatasetRef должен содержать relations и fields в том же формате, что и текущее состояние
    state.origDatasetRef.value = JSON.parse(JSON.stringify(data))
    
    // Обновляем relations в origDatasetRef, чтобы они совпадали с текущим состоянием
    const origMain = (state.origDatasetRef.value.tables || []).find(t => t.order === 0)
    state.origDatasetRef.value._cachedRelations = state.normalizeRelations(
      state.getRelationsFromDataset(state.origDatasetRef.value, origMain ? origMain.id : null)
    )
  }
  
  async function hydrateFromDataset(ds) {
    const main = (ds.tables || []).find(t => t.order === 0 || !t.joined_on_type) || (ds.tables ? ds.tables[0] : null)
    
    if (main) {
      const mappedTable = mapTable(main)
      
      if (state.selectedConnection.value) {
        let belongsToCurrentConnection = false
        
        if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
            state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = mappedTable.file_id === state.selectedConnection.value.id
        } else {
          belongsToCurrentConnection = !mappedTable.connection_id || mappedTable.connection_id === state.selectedConnection.value.id
        }
        
        if (!belongsToCurrentConnection) {
          state.mainTable.value = null
          state.relations.value = []
          state.selectedTables.value = []
        } else {
          state.mainTable.value = mappedTable
        }
      } else {
        state.mainTable.value = mappedTable
      }
    }

    const connId = main?.connection || ds.selectedConnection
    if (connId) {
      if (!state.selectedConnection.value)
        state.selectedConnection.value = { id: connId, name: `Connection #${connId}` }

      await fetchConnectionFiles(connId)
      state.relations.value = state.getRelationsFromDataset(ds, main ? main.id : null)
      buildAllTables(state.fileUploadsCache.value, ds.tables)

      try {
        const resp = await connectionService.get(connId)
        const conn = resp?.data ?? resp
        if (conn && conn.name) {
          state.selectedConnection.value = {
            ...state.selectedConnection.value,
            name: conn.name || state.selectedConnection.value.name,
            connector_type: conn.connector_type ?? state.selectedConnection.value.connector_type
          }
        }
        
        if (state.fileUploadsCache.value) {
          updateConnectionStatus(state.fileUploadsCache.value)
        }
      } catch (e) {
        console.warn('[useDatasetActions] Не удалось получить название подключения:', e)
      }
    } else {
      state.selectedConnection.value = null
      state.relations.value = state.getRelationsFromDataset(ds, main ? main.id : null)
      buildAllTables(state.fileUploadsCache.value, ds.tables)
    }
    
    sanitizeRelations()
  }
  
  // Функции для работы с подключениями
  async function fetchConnectionFiles(connId) {
    try {
      const { data } = await connectionService.getFiles(connId)
      state.fileUploadsCache.value = data
      
      if (state.selectedConnection.value && state.selectedConnection.value.id === connId) {
        updateConnectionStatus(data)
      }
      
      if (state.relations.value.length > 0) {
        const validRelations = state.relations.value.filter(rel => {
          const rightTable = state.allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
          if (!rightTable) return false
          
          let belongsToCurrentConnection = false
          
          if (state.selectedConnection.value?.connector_type_display?.toLowerCase().includes('file') || 
              state.selectedConnection.value?.connector_type?.toLowerCase().includes('файл')) {
            belongsToCurrentConnection = rightTable.file_id === state.selectedConnection.value.id
          } else {
            belongsToCurrentConnection = !rightTable.connection_id || rightTable.connection_id === state.selectedConnection.value.id
          }
          
          return belongsToCurrentConnection
        })
        
        if (validRelations.length < state.relations.value.length) {
          state.relations.value = validRelations
        }
      }
      
      if (state.mainTable.value && state.selectedConnection.value) {
        let belongsToCurrentConnection = false
        
        if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
            state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = state.mainTable.value.file_id === state.selectedConnection.value.id
        } else {
          belongsToCurrentConnection = !state.mainTable.value.connection_id || state.mainTable.value.connection_id === state.selectedConnection.value.id
        }
        
        if (!belongsToCurrentConnection) {
          state.mainTable.value = null
          state.relations.value = []
          state.selectedTables.value = []
        }
      }
    } catch (e) {
      console.warn('[useDatasetActions] Не удалось получить файлы подключения:', e)
    }
  }
  
  function updateConnectionStatus(files) {
    if (!state.selectedConnection.value || !files) return
    
    const fileStatus = analyzeFileStatus(files)
    
    state.selectedConnection.value = {
      ...state.selectedConnection.value,
      hasMissingFiles: fileStatus.hasMissingFiles,
      hasProblematicFiles: fileStatus.hasProblematicFiles,
      missing_files: fileStatus.missingFiles,
      problematic_files: fileStatus.problematicFiles
    }
    
    if (state.mainTable.value || state.relations.value.length > 0) {
      if (state.mainTable.value && state.selectedConnection.value) {
        let belongsToCurrentConnection = false
        
        if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
            state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = state.mainTable.value.file_id === state.selectedConnection.value.id
        } else {
          belongsToCurrentConnection = !state.mainTable.value.connection_id || state.mainTable.value.connection_id === state.selectedConnection.value.id
        }
        
        if (!belongsToCurrentConnection) {
          state.mainTable.value = null
          state.relations.value = []
          state.selectedTables.value = []
          return
        }
      }
      
      if (state.relations.value.length > 0) {
        const validRelations = state.relations.value.filter(rel => {
          const rightTable = state.allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
          if (!rightTable) return false
          
          let belongsToCurrentConnection = false
          if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
              state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
            belongsToCurrentConnection = rightTable.file_id === state.selectedConnection.value.id
          } else {
            belongsToCurrentConnection = !rightTable.connection_id || rightTable.connection_id === state.selectedConnection.value.id
          }
          
          return belongsToCurrentConnection
        })
        
        if (validRelations.length !== state.relations.value.length) {
          state.relations.value = validRelations
        }
      }
    }
  }
  
  function analyzeFileStatus(files) {
    const missingFiles = []
    const problematicFiles = []
    
    files.forEach(file => {
      if (file.status === 'error' || file.status === 'failed' || file.problematic) {
        problematicFiles.push(file)
      }
      
      if (file.status === 'missing' || file.missing || !file.original_filename) {
        missingFiles.push(file)
      }
      
      if (file.connector_type && (file.connector_type.includes('file') || file.connector_type.includes('файл'))) {
        if (!file.columns_info && file.expected_columns) {
          problematicFiles.push(file)
        }
      }
      
      if (state.selectedConnection.value) {
        let belongsToCurrentConnection = false
        
        if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
            state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = file.connection_id === state.selectedConnection.value.id || file.id === state.selectedConnection.value.id
        } else {
          belongsToCurrentConnection = !file.connection_id || file.connection_id === state.selectedConnection.value.id
        }
        
        if (!belongsToCurrentConnection) {
          return
        }
      }
    })
    
    return {
      hasMissingFiles: missingFiles.length > 0,
      hasProblematicFiles: problematicFiles.length > 0,
      missingFiles: missingFiles,
      problematicFiles: problematicFiles
    }
  }
  
  // Функции для работы с таблицами
  function buildAllTables(files = state.fileUploadsCache.value, freshTables) {
    const dsTablesRaw = freshTables || state.dataset.value?.tables || []
    const mainTableId = dsTablesRaw.find(t => t.order === 0)?.id

    const dsTables = dsTablesRaw.map(t => ({
      ...t,
      id: Number(t.id),
      file_id: t.file_upload_id,
      display_name: t.display_name || t.file_upload_name || t.table_name,
      name: t.display_name || t.file_upload_name || t.table_name,
      columns_info: t.columns_info || null,
      file_upload_name: t.file_upload_name || null,
      isMain: Number(t.id) === Number(mainTableId),
    }))

    const uniqueStaging = new Map()
    
    if (files && Array.isArray(files)) {
      files.forEach(f => {
        if (state.selectedConnection.value) {
          let belongsToCurrentConnection = false
          
          if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
              state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
            belongsToCurrentConnection = f.connection_id === state.selectedConnection.value.id || f.id === state.selectedConnection.value.id
          } else {
            belongsToCurrentConnection = !f.connection_id || f.connection_id === state.selectedConnection.value.id
          }
          
          if (!belongsToCurrentConnection) {
            return
          }
        }
        
        uniqueStaging.set(f.id, {
          ...f,
          id: -f.id,
          file_id: f.id,
          order: 1,
          display_name: f.original_filename,
          name: f.original_filename,
          columns_info: f.columns_info || null,
          isMain: false
        })
      })
    }

    dsTables.forEach(t => {
      const key = t.file_id || t.id
      if (t.file_id && uniqueStaging.has(t.file_id)) {
        const fileData = uniqueStaging.get(t.file_id)
        const mergedData = { ...fileData, ...t, id: t.id }

        mergedData.display_name = t.display_name || fileData.display_name
        mergedData.name = mergedData.display_name

        uniqueStaging.set(t.file_id, mergedData)
      } else if (key) {
        uniqueStaging.set(key, t)
      }
    })

    state.allTablesOfConnection.value = Array.from(uniqueStaging.values())
    
    // Проверяем принадлежность главной таблицы к текущему подключению
    if (state.mainTable.value && state.selectedConnection.value) {
      let belongsToCurrentConnection = false
      
      if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
          state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
        belongsToCurrentConnection = state.mainTable.value.file_id === state.selectedConnection.value.id
      } else {
        belongsToCurrentConnection = !state.mainTable.value.connection_id || state.mainTable.value.connection_id === state.selectedConnection.value.id
      }
      
      if (!belongsToCurrentConnection) {
        // Сбрасываем все связанные данные при несоответствии подключения
        state.mainTable.value = null
        state.relations.value = []
        state.selectedTables.value = []
        state.fields.value = []
        state.previewCols.value = []
        state.previewRows.value = []
      }
    }
    
    updateSelectedTables()
  }
  
  function mapTable(t) {
    const isMain = t.order === 0
    
    if (state.selectedConnection.value) {
      let belongsToCurrentConnection = false
      
      if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
          state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
        belongsToCurrentConnection = t.file_upload_id === state.selectedConnection.value.id || t.file_id === state.selectedConnection.value.id
      } else {
        belongsToCurrentConnection = !t.connection_id || t.connection_id === state.selectedConnection.value.id
      }
      
      if (!belongsToCurrentConnection) {
        return null
      }
    }
    
    if (!isMain &&
      /^temp_[a-f0-9]{32}/.test(t.table_name) &&
      !t.columns_info &&
      (t.file_upload_id == null && t.file_id == null)) {
      return null
    }
    
    return {
      ...t,
      id: Number(t.id),
      file_id: t.file_upload_id,
      display_name: t.display_name || t.file_upload_name || t.table_name,
      name: t.display_name || t.file_upload_name || t.table_name,
      columns_info: t.columns_info || null,
      file_upload_name: t.file_upload_name || null,
      isMain
    }
  }
  
  function updateSelectedTables() {
    const tables = new Set()
    
    if (state.mainTable.value && state.selectedConnection.value) {
      let belongsToCurrentConnection = false
      
      if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
          state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
        belongsToCurrentConnection = state.mainTable.value.file_id === state.selectedConnection.value.id
      } else {
        belongsToCurrentConnection = !state.mainTable.value.connection_id || state.mainTable.value.connection_id === state.selectedConnection.value.id
      }
      
      if (belongsToCurrentConnection) {
        tables.add(state.mainTable.value)
      } else {
        // Сбрасываем все связанные данные при несоответствии подключения
        state.mainTable.value = null
        state.relations.value = []
        state.fields.value = []
        state.previewCols.value = []
        state.previewRows.value = []
      }
    }

    state.relations.value = state.relations.value.filter(rel => {
      const tbl = state.allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
      if (tbl) {
        let belongsToCurrentConnection = false
        
        if (state.selectedConnection.value?.connector_type_display?.toLowerCase().includes('file') || 
            state.selectedConnection.value?.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = tbl.file_id === state.selectedConnection.value.id
        } else {
          belongsToCurrentConnection = !tbl.connection_id || tbl.connection_id === state.selectedConnection.value.id
        }
        
        if (belongsToCurrentConnection) {
          tables.add(tbl)
          return true
        } else {
          return false
        }
      } else {
        return false
      }
    })

    state.selectedTables.value = Array.from(tables)
  }
  
  function sanitizeRelations() {
    const mainId = state.mainTable.value?.id
    if (!mainId) return

    const originalLength = state.relations.value.length
    
    const filteredRelations = state.relations.value.filter(rel => {
      if (String(rel.rightTableId) === String(mainId)) {
        return false
      }
      
      const rightTable = state.allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
      if (!rightTable) {
        return false
      }
      
      if (state.selectedConnection.value) {
        let belongsToCurrentConnection = false
        
        if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
            state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = rightTable.file_id === state.selectedConnection.value.id
        } else {
          belongsToCurrentConnection = !rightTable.connection_id || rightTable.connection_id === state.selectedConnection.value.id
        }
        
        if (!belongsToCurrentConnection) {
          return false
        }
      }
      
      return true
    })

    if (filteredRelations.length < originalLength) {
      state.relations.value = filteredRelations
      
      // Если были удалены связи, также очищаем поля и предпросмотр
      if (filteredRelations.length === 0) {
        state.fields.value = []
        state.previewCols.value = []
        state.previewRows.value = []
      }
    }
  }
  
  // Функция ожидания результата асинхронной задачи
  async function waitForTaskResult(taskId, maxAttempts = 120, initialInterval = 1000) {
    // Используем экспоненциальный backoff: начинаем с 1 секунды, увеличиваем до 3 секунд
    let currentInterval = initialInterval
    const maxInterval = 3000
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await datasetService.previewTaskStatus(taskId)
        const statusData = response?.data || response
        
        if (statusData?.status === 'success' && statusData?.result) {
          return statusData.result
        } else if (statusData?.status === 'failure') {
          console.error('Задача завершилась с ошибкой:', statusData.error)
          return null
        } else if (statusData?.status === 'processing' || statusData?.status === 'pending') {
          // Задача еще выполняется, ждем
          // Увеличиваем интервал постепенно (экспоненциальный backoff)
          if (attempt < 10) {
            currentInterval = initialInterval // Первые 10 попыток - быстро
          } else if (attempt < 30) {
            currentInterval = 2000 // Следующие 20 попыток - средний интервал
          } else {
            currentInterval = maxInterval // Дальше - максимальный интервал
          }
          
          await new Promise(resolve => setTimeout(resolve, currentInterval))
          continue
        } else {
          // Неизвестный статус
          console.warn('Неизвестный статус задачи:', statusData?.status)
          await new Promise(resolve => setTimeout(resolve, currentInterval))
          continue
        }
      } catch (error) {
        console.error('Ошибка проверки статуса задачи:', error)
        // При ошибке ждем и пробуем еще раз
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, currentInterval))
          continue
        } else {
          return null
        }
      }
    }
    
    console.warn('Превышено максимальное время ожидания задачи (', maxAttempts * currentInterval / 1000, 'секунд)')
    return null
  }
  
  // Функции для работы с preview
  async function loadPreview() {
    state.isPreviewLoading.value = true
    try {
      const main = state.mainTable.value
      
      if (main && state.selectedConnection.value) {
        let belongsToCurrentConnection = false
        
        if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
            state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = main.file_id === state.selectedConnection.value.id
        } else {
          belongsToCurrentConnection = !main.connection_id || main.connection_id === state.selectedConnection.value.id
        }
        
        if (!belongsToCurrentConnection) {
          // Сбрасываем все связанные данные при несоответствии подключения
          state.mainTable.value = null
          state.relations.value = []
          state.selectedTables.value = []
          state.fields.value = []
          state.previewCols.value = []
          state.previewRows.value = []
          return
        }
      }
      
      const joined = state.relations.value.map(rel => {
        const tbl = state.allTablesOfConnection.value.find(t => t.id === rel.rightTableId)
        if (!tbl) return null
        
        if (state.selectedConnection.value) {
          let belongsToCurrentConnection = false
          
          if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
              state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
            belongsToCurrentConnection = tbl.file_id === state.selectedConnection.value.id
          } else {
            belongsToCurrentConnection = !tbl.connection_id || tbl.connection_id === state.selectedConnection.value.id
          }
          
          if (!belongsToCurrentConnection) {
            return null
          }
        }
        
        return {
          ...tbl,
          joinType: rel.joinType,
          lines: rel.lines
        }
      }).filter(Boolean)
      
      if (joined.length < state.relations.value.length) {
        state.relations.value = state.relations.value.filter(rel => 
          joined.some(joinedTbl => joinedTbl.id === rel.rightTableId)
        )
      }
      
      // Проверяем наличие главной таблицы перед отправкой запроса
      if (!main) {
        state.previewCols.value = []
        state.previewRows.value = []
        return
      }
      
      let resp = null
      
      // Для сохраненного датасета используем preview API, для черновика - draftPreview
      if (state.dataset.value?.id) {
        // Сохраненный датасет - загружаем только колонки (первая страница для определения структуры)
        // Сами данные будут загружаться через DatasetTablePreview с серверной пагинацией
        const ITEMS_PER_PAGE = parseInt(import.meta.env.VITE_BI_PREVIEW_ITEMS_PER_PAGE || '20', 10)
        try {
          resp = await datasetService.preview(state.dataset.value.id, {
            limit: ITEMS_PER_PAGE, // Загружаем только первую страницу для определения колонок
            offset: 0
          })
          
          // API может вернуть данные напрямую или обернутые в data
          const data = resp?.data || resp
          
          // Проверяем, не является ли это асинхронной задачей
          if (data?.status === 'processing' && data?.task_id) {
            console.log('Предпросмотр обрабатывается асинхронно, ожидаем результат...', data.task_id)
            // Ожидаем результат асинхронной задачи
            const result = await waitForTaskResult(data.task_id)
            if (result && (result.columns || result.rows)) {
              state.previewCols.value = result.columns || []
              // Не сохраняем rows - они будут загружаться через DatasetTablePreview с пагинацией
              state.previewRows.value = []
              await loadFields()
            } else {
              // Не очищаем данные при ошибке, чтобы таблица не исчезла
              if (!state.previewCols.value.length) {
                state.previewCols.value = []
              }
            }
            return
          }
          
          if (data && data.columns) {
            state.previewCols.value = data.columns || []
            // Не сохраняем rows - они будут загружаться через DatasetTablePreview с пагинацией
            state.previewRows.value = []
            await loadFields()
          } else {
            // Не очищаем данные при ошибке, чтобы таблица не исчезла
            if (!state.previewCols.value.length) {
              state.previewCols.value = []
            }
          }
        } catch (error) {
          console.error('Ошибка загрузки предпросмотра сохраненного датасета:', error)
          // Не очищаем данные при ошибке, чтобы таблица не исчезла
          if (!state.previewCols.value.length) {
            state.previewCols.value = []
          }
        }
      } else {
        // Черновик - используем draftPreview
        try {
          const draftParams = {
            connection_id: state.selectedConnection.value?.id,
            mainTable: main,
            joinedTables: joined,
          }
          // Передаем limit только если он указан (не null)
          if (state.previewLimit.value !== null && state.previewLimit.value !== undefined) {
            draftParams.limit = state.previewLimit.value
          }
          resp = await datasetService.draftPreview(draftParams)
          
          // API может вернуть данные напрямую или обернутые в data
          const data = resp?.data || resp
          
          // Проверяем, не является ли это асинхронной задачей
          if (data?.status === 'processing' && data?.task_id) {
            console.log('Предпросмотр обрабатывается асинхронно, ожидаем результат...', data.task_id)
            // Ожидаем результат асинхронной задачи
            const result = await waitForTaskResult(data.task_id)
            if (result && (result.columns || result.rows)) {
              state.previewCols.value = result.columns || []
              state.previewRows.value = result.rows || []
              await loadFields()
            } else {
              // Не очищаем данные при ошибке, чтобы таблица не исчезла
              if (!state.previewCols.value.length && !state.previewRows.value.length) {
                state.previewCols.value = []
                state.previewRows.value = []
              }
            }
            return
          }
          
          if (data && (data.columns || data.rows)) {
            state.previewCols.value = data.columns || []
            state.previewRows.value = data.rows || []
            await loadFields()
          } else {
            // Не очищаем данные при ошибке, чтобы таблица не исчезла
            if (!state.previewCols.value.length && !state.previewRows.value.length) {
              state.previewCols.value = []
              state.previewRows.value = []
            }
          }
        } catch (error) {
          console.error('Ошибка загрузки предпросмотра черновика:', error)
          // Не очищаем данные при ошибке, чтобы таблица не исчезла
          if (!state.previewCols.value.length && !state.previewRows.value.length) {
            state.previewCols.value = []
            state.previewRows.value = []
          }
        }
      }
    } finally {
      state.isPreviewLoading.value = false
    }
  }
  
  async function loadFields() {
    if (state.previewCols.value.length && state.previewRows.value.length) {
      const allDraftTables = [
        state.mainTable.value,
        ...state.relations.value.map(r => state.allTablesOfConnection.value.find(t => t.id === r.rightTableId)).filter(Boolean)
      ]
      
      const col2Table = {}
      state.previewCols.value.forEach(col => {
        let foundTable = allDraftTables.find(t =>
          t?.columns_info?.columns?.includes(col)
        )
        col2Table[col] = foundTable || state.mainTable.value
      })

      if (state.dataset.value?.id && Array.isArray(state.origDatasetRef.value?.fields) && state.origDatasetRef.value.fields.length) {
        const origFieldsMap = new Map(
          state.origDatasetRef.value.fields.map(f => [String(f.id ?? f.name), f])
        )

        const fieldsList = state.previewCols.value.map((col, idx) => {
          let orig = state.origDatasetRef.value.fields.find(f => f.source_column === col || f.name === col)
          if (origFieldsMap.has(String(orig?.id))) orig = origFieldsMap.get(String(orig.id))
          const tableObj = col2Table[col] || state.mainTable.value
          const columnValues = state.previewRows.value.map(row => row[idx])
          const colType = detectColumnType(columnValues)

          return {
            id: orig?.id,
            name: orig?.name || col,
            aggregation: orig?.aggregation || 'none',
            type: orig?.type || colType,
            description: orig?.description || '',
            source: { column: col },
            source_table: tableObj
          }
        })

        state.fields.value = fieldsList
      } else {
        const fieldsList = state.previewCols.value.map((col, idx) => {
          const tableObj = col2Table[col] || state.mainTable.value
          const columnValues = state.previewRows.value.map(row => row[idx])
          const colType = detectColumnType(columnValues)

          return {
            name: col,
            aggregation: 'none',
            type: colType,
            description: '',
            source: { column: col },
            source_table: tableObj
          }
        })

        state.fields.value = fieldsList
      }
    }
  }
  
  function detectColumnType(values) {
    const filtered = values.filter(v => v !== null && v !== undefined && v !== '')
    
    if (!filtered.length) return 'string'
    
    if (filtered.every(v => /^(\d{4}-\d{2}-\d{2})$/.test(v) || v instanceof Date)) {
      return 'date'
    }
    
    if (filtered.every(v => /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?)$/.test(v))) {
      return 'date&time'
    }
    
    if (filtered.every(v => v === 'true' || v === 'false' || typeof v === 'boolean')) {
      return 'bool'
    }
    
    if (filtered.every(v => !isNaN(v) && Number.isInteger(+v))) {
      return 'integer'
    }
    
    if (filtered.every(v => !isNaN(v) && !Number.isNaN(parseFloat(v)))) {
      return 'float'
    }
    
    return 'string'
  }
  
  // Функции для работы с полями
  async function refreshFields() {
    if (!state.dataset.value || !state.dataset.value.id) return
    
    if (state.mainTable.value && state.selectedConnection.value) {
      let belongsToCurrentConnection = false
      
      if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
          state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
        belongsToCurrentConnection = state.mainTable.value.file_id === state.selectedConnection.value.id
      } else {
        belongsToCurrentConnection = !state.mainTable.value.connection_id || state.mainTable.value.connection_id === state.selectedConnection.value.id
      }
      
      if (!belongsToCurrentConnection) {
        // Сбрасываем все связанные данные при несоответствии подключения
        state.mainTable.value = null
        state.relations.value = []
        state.selectedTables.value = []
        state.fields.value = []
        state.previewCols.value = []
        state.previewRows.value = []
        return
      }
    }
    
    const renames = state.fields.value
      .filter(f => f.name && f.source && f.source.column)
      .map(f => ({
        old_name: f.source.column,
        new_name: f.name,
      }))

    if (renames.length && state.dataset.value && state.dataset.value.id) {
      const { error } = await datasetService.renameColumns(state.dataset.value.id, renames)
      if (error) return

      const fieldsResp = await datasetService.listFields({ dataset: state.dataset.value.id })
      if (fieldsResp && fieldsResp.data) {
        state.fields.value = fieldsResp.data
      }
    }
    
    await loadPreview()
  }
  
  // Функции для работы со связями
  function handleRelationApply(relation) {
    let rightId = relation.rightTableId
    let staging = state.allTablesOfConnection.value.find(tbl => tbl.id === rightId)

    if (!staging) {
      staging = state.allTablesOfConnection.value.find(tbl => tbl.file_id === rightId && tbl.id > 0)
      if (staging) rightId = staging.id
    }

    if (!staging) return
    
    if (state.selectedConnection.value) {
      let belongsToCurrentConnection = false
      
      if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
          state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
        belongsToCurrentConnection = staging.file_id === state.selectedConnection.value.id
      } else {
        belongsToCurrentConnection = !staging.connection_id || staging.connection_id === state.selectedConnection.value.id
      }
      
      if (!belongsToCurrentConnection) {
        return
      }
    }
    
    const idx = state.relations.value.findIndex(r => r.rightTableId === rightId)
    const fixedRel = { ...relation, rightTableId: rightId }
    
    if (idx !== -1) {
      state.relations.value[idx] = fixedRel
    } else {
      state.relations.value.push(fixedRel)
    }
    
    buildAllTables()
    updateSelectedTables()
    loadPreview()
    sanitizeRelations()
  }
  
  function removeRelationById(rightTableId) {
    const relation = state.relations.value.find(rel => rel.rightTableId === rightTableId)
    if (!relation) return
    
    if (state.selectedConnection.value) {
      const rightTable = state.allTablesOfConnection.value.find(t => t.id === rightTableId)
      if (rightTable) {
        let belongsToCurrentConnection = false
        
        if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
            state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
          belongsToCurrentConnection = rightTable.file_id === state.selectedConnection.value.id
        } else {
          belongsToCurrentConnection = !rightTable.connection_id || rightTable.connection_id === state.selectedConnection.value.id
        }
        
        if (!belongsToCurrentConnection) {
          // Связь не принадлежит текущему подключению
        }
      }
    }
    
    state.relations.value = state.relations.value.filter(rel => rel.rightTableId !== rightTableId)
    loadPreview()
  }
  
  // Функции для UI
  function togglePreview() {
  if (state.isPreviewVisible.value) {
    state.isPreviewVisible.value = false
  } else {
    if (state.mainTable.value && state.selectedConnection.value) {
      let belongsToCurrentConnection = false
      
      if (state.selectedConnection.value.connector_type_display?.toLowerCase().includes('file') || 
          state.selectedConnection.value.connector_type?.toLowerCase().includes('файл')) {
        belongsToCurrentConnection = state.mainTable.value.file_id === state.selectedConnection.value.id
      } else {
        belongsToCurrentConnection = !state.mainTable.value.connection_id || state.mainTable.value.connection_id === state.selectedConnection.value.id
      }
      
      if (!belongsToCurrentConnection) {
        // Сбрасываем все связанные данные при несоответствии подключения
        state.mainTable.value = null
        state.relations.value = []
        state.selectedTables.value = []
        state.fields.value = []
        state.previewCols.value = []
        state.previewRows.value = []
        state.isPreviewVisible.value = false
        return
      }
    }
    
    state.isPreviewVisible.value = true
    loadPreview()
  }
}
  
  function addField() {
    state.selectedField.value = null
    state.showModal.value = true
  }
  
  function handleRemoveTable(t) {
  const i = state.selectedTables.value.indexOf(t)
  if (i !== -1) {
    state.selectedTables.value.splice(i, 1)
  }
  
  // Если удаляемая таблица была главной, сбрасываем связанные данные
  if (state.mainTable.value && state.mainTable.value.id === t.id) {
    state.mainTable.value = null
    state.relations.value = []
    state.fields.value = []
    state.previewCols.value = []
    state.previewRows.value = []
  }
  
  // Удаляем связи, связанные с удаляемой таблицей
  state.relations.value = state.relations.value.filter(rel => rel.rightTableId !== t.id)
}
  
  function onSourceSave(newField) {
    state.fields.value = [...state.fields.value, newField]
    state.showModal.value = false
  }
  
  // Экспортируем все функции
  return {
    saveDataset,
    editDataset,
    safeUpdateDataset,
    loadDataset,
    hydrateFromDataset,
    fetchConnectionFiles,
    updateConnectionStatus,
    analyzeFileStatus,
    buildAllTables,
    mapTable,
    updateSelectedTables,
    sanitizeRelations,
    loadPreview,
    loadFields,
    detectColumnType,
    refreshFields,
    handleRelationApply,
    removeRelationById,
    togglePreview,
    addField,
    handleRemoveTable,
    onSourceSave
  }
}
