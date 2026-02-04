<template>
  <div class="dashboard-grid" :class="{ 'view-mode': viewMode }" @dragover="handleDragOver" @drop="handleDrop" @dragenter="handleDragEnter" @dragleave="handleDragLeave" @mousemove="handleMouseMove" ref="gridContainer">
    <div v-if="items.length === 0" class="empty-grid" :class="{ 'drag-over': isDragOver }">
      <div class="empty-content">
        <LayoutDashboard :size="48" />
        <h3>{{ pagesCount > 1 ? 'На этой странице пока пусто' : 'Дашборд пока пустой' }}</h3>
        <p>Перетаскивайте блоки с панели снизу, чтобы добавить на дашборд чарт, селектор или поясняющий текст</p>
      </div>
    </div>

    <div v-else class="grid-container">
      <div class="grid-background" aria-hidden="true" />
      <div class="grid-rows-layer" aria-hidden="true">
        <div
          v-for="(line, idx) in existingRowLines"
          :key="idx"
          class="grid-row-line"
          :style="{ top: `${line}px` }"
        />
      </div>
      <DashboardGridItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        :view-mode="viewMode"
        :element-sizes="ELEMENT_SIZES"
        :shift-style="shiftedItemsStyle[item.id] || {}"
        :is-dragging-existing="isDraggingExisting"
        :dragged-item-id="draggedItem ? draggedItem.id : null"
        :show-hint="showHint"
        :hide-hint="hideHint"
        :item-preview="getItemPreview(item)"
        @select="selectItem"
        @dblclick="onItemDblclick"
        @mousedown="handleMouseDown"
        @edit="editItem"
        @delete="deleteItem"
        @start-resize="startResize"
        @update-active-chart="updateActiveChart"
        @chart-resize="handleChartResize"
        @selector-selection-change="handleSelectorSelectionChange"
        @selector-resize="handleSelectorResize"
        @selector-apply-filters="handleSelectorApplyFilters"
        @selector-clear-filters="handleSelectorClearFilters"
      />
    </div>

    <Teleport to="body">
      <div v-if="showGrayPlaceholder && grayPlaceholderStyle" class="gray-placeholder" :style="grayPlaceholderStyle"></div>
    </Teleport>
    
    <div v-if="showYellowPlaceholder && yellowPlaceholderStyle" class="yellow-placeholder" :style="yellowPlaceholderStyle">
      <div class="placeholder-content">
        <span>Разместить здесь</span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="isDraggingExisting && draggedItem && draggedElementCursorPosition"
        :style="{
          position: 'fixed',
          left: `${draggedElementCursorPosition.x - draggedElementCursorOffset.x}px`,
          top: `${draggedElementCursorPosition.y - draggedElementCursorOffset.y}px`,
          width: `${draggedItem.width || ELEMENT_SIZES[draggedItem.type]?.width || 200}px`,
          height: `${draggedItem.height || ELEMENT_SIZES[draggedItem.type]?.height || 150}px`,
          zIndex: 2000,
          pointerEvents: 'none',
          opacity: 0.85,
          boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
          border: '2px solid var(--color-primary)',
          borderRadius: '8px',
          background: 'var(--color-primary-background)'
        }"
        class="dragged-element-preview"
      >
        <div class="dragged-item-header">
          <span class="dragged-item-type">{{ draggedItem.type }}</span>
        </div>
        <div class="dragged-item-content">
          <div class="dragged-item-preview">
            {{ getItemPreview(draggedItem) }}
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="hintVisible" class="hint-tooltip"  :style="hintTooltipStyle" @mouseenter="cancelHideHint" @mouseleave="hideHint">
        <div v-html="hintContent" class="hint-content"></div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Teleport } from 'vue'
import { LayoutDashboard } from 'lucide-vue-next'
import DashboardGridItem from './DashboardGridItem.vue'

const GRID_GAP = 10
const GRID_PADDING = 10
const GRID_CONTAINER_PADDING = 20

const ELEMENT_SIZES = {
  'Чарт': { width: 560, height: 300 },
  'Селектор': { width: 370, height: 50 },
  'Текст': { width: 560, height: 150 },
  // Для заголовка дефолтная ширина будет подставляться динамически
  'Заголовок': { width: 600, height: 50 }
}

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  draggedType: {
    type: String,
    default: ''
  },
  pagesCount: {
    type: Number,
    default: 1
  },
  viewMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:items',
  'item-select',
  'item-edit', 
  'item-delete'
])

const gridContainer = ref(null)
const localItems = ref([])
const isDragOver = ref(false)
const showGrayPlaceholder = ref(false)
const showYellowPlaceholder = ref(false)
const grayPlaceholderPosition = ref({ x: 0, y: 0 })
const yellowPlaceholderPosition = ref({ x: 0, y: 0, width: 0, height: 0 })
const currentDraggedType = ref('')
const draggedItem = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const isDraggingExisting = ref(false)
const resizingItem = ref(null)
const resizeStartPos = ref({ x: 0, y: 0 })
const resizeStartSize = ref({ width: 0, height: 0 })
const resizeDirection = ref('')
const draggedElementCursorOffset = ref({ x: 0, y: 0 })
const draggedElementCursorPosition = ref({ x: 0, y: 0 })
const isMouseDown = ref(false)
const hintVisible = ref(false)
const hintContent = ref('')
const hintTooltipStyle = ref({})
let hideHintTimer = null
const resizeObserver = ref(null)
const autoHeightItems = ref(new Map())
const isRecalculatingPositions = ref(false)
const documentDragOverListenerAttached = ref(false)
const documentMouseMoveListenerAttached = ref(false)

const getEffectiveElementSize = (type) => {
  const baseSize = ELEMENT_SIZES[type]
  if (!baseSize) return null

  if (type === 'Заголовок' && gridContainer.value) {
    const contentWidth = gridContainer.value.clientWidth
    return {
      width: Math.max(100, contentWidth),
      height: baseSize.height
    }
  }

  return baseSize
}

const grayPlaceholderStyle = computed(() => {
  if (!showGrayPlaceholder.value || !currentDraggedType.value) return null

  const size = getEffectiveElementSize(currentDraggedType.value)
  if (!size) return null
  
  return {
    position: 'fixed',
    left: `${grayPlaceholderPosition.value.x - size.width / 2}px`,
    top: `${grayPlaceholderPosition.value.y - size.height / 2}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    pointerEvents: 'none',
    zIndex: 9999
  }
})

const yellowPlaceholderStyle = computed(() => {
  if (!showYellowPlaceholder.value) return null
  const p = yellowPlaceholderPosition.value
  return {
    position: 'absolute',
    left: `${(p.x || 0)}px`,
    top: `${(p.y || 0)}px`,
    width: `${p.width || 0}px`,
    height: `${p.height || 0}px`,
    pointerEvents: 'none'
  }
})

const shiftedItemsStyle = computed(() => {
  if (!showYellowPlaceholder.value) return {}
  const placeholderY = yellowPlaceholderPosition.value.y
  if (placeholderY >= 10) return {}
  const placeholderHeight = yellowPlaceholderPosition.value.height
  
  const styles = {}
  
  localItems.value.forEach(item => {
    const itemY = item.y || 0
    const itemHeight = item.height || ELEMENT_SIZES[item.type]?.height || 150
    
    const itemBottom = itemY + itemHeight
    
    if (itemY >= placeholderY) {
      const shiftAmount = placeholderHeight + GRID_GAP
      styles[item.id] = {
        transform: `translateY(${shiftAmount}px)`,
        transition: 'transform 0.2s ease'
      }
    }
    else if (itemY < placeholderY && itemBottom > placeholderY) {
      const shiftAmount = placeholderY + placeholderHeight - itemY + GRID_GAP
      styles[item.id] = {
        transform: `translateY(${shiftAmount}px)`,
        transition: 'transform 0.2s ease'
      }
    }
  })
  
  return styles
})

const getItemPreview = (item) => {
  const itemWidth = item.width || ELEMENT_SIZES[item.type]?.width || 200
  
  let preview = ''
  switch (item.type) {
    case 'Чарт': 
      preview = itemWidth < 300 ? '📊 График' : '📊 График данных'
      break
    case 'Селектор': 
      preview = itemWidth < 200 ? '🔽' : '🔽 Фильтр'
      break
    case 'Текст': 
      preview = itemWidth < 300 ? '📝 Текст' : '📝 Поясняющий текст'
      break
    case 'Заголовок': 
      preview = itemWidth < 400 ? '📋 Заголовок' : '📋 Заголовок раздела'
      break
    default: 
      preview = item.type
  }
  
  return preview
}

const showHint = (item, event) => {
  if (hideHintTimer) {
    clearTimeout(hideHintTimer);
    hideHintTimer = null;
  }
  if (item.hintText) {
    hintContent.value = item.hintText; 
    const rect = event.target.getBoundingClientRect();
    hintTooltipStyle.value = {
      display: 'flex',
      textAlign: 'center',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '0',
      top: `${rect.bottom + 5}px`,
      left: `${rect.left}px`,
    };
    hintVisible.value = true;
  }
};

const hideHint = () => {
  hideHintTimer = setTimeout(() => {
    hintVisible.value = false;
  }, 200);
};

const cancelHideHint = () => {
  if (hideHintTimer) {
    clearTimeout(hideHintTimer);
    hideHintTimer = null;
  }
};

const selectItem = (item) => {
  if (props.viewMode || draggedItem.value || isDraggingExisting.value || isMouseDown.value) return
  
  localItems.value.forEach(i => i.selected = false)
  item.selected = true
  emit('item-select', item)
  emit('update:items', localItems.value)
}

const onItemDblclick = (item) => {
  if (!props.viewMode) editItem(item)
}

const editItem = (item) => {
  if (props.viewMode) return
  emit('item-edit', item)
}

const deleteItem = (item) => {
  const index = localItems.value.findIndex(i => i.id === item.id)
  if (index === -1) return
  const deletedY = item.y || 0
  const deletedSize = getActualItemSize(item)
  const deletedHeight = deletedSize.height
  localItems.value.splice(index, 1)
  const shiftUp = deletedHeight + GRID_GAP
  localItems.value.forEach(i => {
    if ((i.y || 0) > deletedY) {
      i.y = (i.y || 0) - shiftUp
    }
  })
  emit('update:items', localItems.value)
  emit('item-delete', item)
}

const updateActiveChart = (item, newIndex) => {
  item.activeChartIndex = newIndex
  emit('update:items', localItems.value)
}

const handleChartResize = (item, newHeight) => {
  if (item.autoHeight) {
    autoHeightItems.value.set(item.id, newHeight);
    nextTick(() => {
      recalculatePositions();
    });
  }
}

const handleSelectorSelectionChange = (item, selectionData) => {
  console.log('Selector selection changed:', selectionData);
}

const handleSelectorResize = (item, newHeight) => {
  const isAutoHeight = item.autoHeight || item.selectorGroupSettings?.autoHeight;
  
  if (isAutoHeight) {
    item.height = newHeight;
    autoHeightItems.value.set(item.id, newHeight);
    
    nextTick(() => {
      recalculatePositions();
    });
  }
}

const handleSelectorApplyFilters = (item, event) => {
  console.log('Apply filters for selector:', item.id);
}

const handleSelectorClearFilters = (item, event) => {
  console.log('Clear filters for selector:', item.id);
}

const findNearestRow = (mouseY, elementHeight) => {
  if (localItems.value.length === 0) return 0
  
  const occupiedAreas = localItems.value.map(item => {
    const actualSize = getActualItemSize(item)
    return {
      top: item.y || 0,
      bottom: (item.y || 0) + actualSize.height
    }
  })
  
  const rows = []
  
  for (const area of occupiedAreas) {
    const rowTop = area.top
    const rowBottom = area.bottom + GRID_GAP
    
    if (!rows.some(row => Math.abs(row.top - rowTop) < 10)) {
      rows.push({ top: rowTop, bottom: rowBottom })
    }
  }
  
  rows.sort((a, b) => a.top - b.top)
  
  let nearestRow = 0
  let minDistance = Infinity
  
  for (const row of rows) {
    const distance = Math.abs(mouseY - (row.top + row.bottom) / 2)
    if (distance < minDistance) {
      minDistance = distance
      nearestRow = row.top
    }
  }
  
  return nearestRow
}

const buildVisualRows = ({ items, excludeItemId, placeholderY, placeholderHeight, elementHeight }) => {
  const list = excludeItemId ? items.filter(item => item.id !== excludeItemId) : [...items]
  if (list.length === 0) {
    return [{ visualTop: 0, visualBottom: elementHeight + GRID_GAP, placementY: 0, items: [], height: elementHeight + GRID_GAP }]
  }

  const dataRows = []
  for (const item of list) {
    const itemY = item.y || 0
    const actualSize = getActualItemSize(item)
    const existing = dataRows.find(r => Math.abs(r.y - itemY) < 10)
    if (existing) {
      existing.items.push(item)
      existing.height = Math.max(existing.height, actualSize.height)
    } else {
      dataRows.push({ y: itemY, height: actualSize.height, items: [item] })
    }
  }
  dataRows.sort((a, b) => a.y - b.y)

  const placeholderAtTop = placeholderY < 10 && (placeholderHeight > 0 || elementHeight > 0)
  const visualRows = []

  if (placeholderAtTop) {
    const topHeight = (placeholderHeight || elementHeight) + GRID_GAP
    visualRows.push({
      visualTop: 0,
      visualBottom: topHeight,
      placementY: 0,
      items: [],
      height: topHeight
    })
    let offset = topHeight
    for (const row of dataRows) {
      visualRows.push({
        visualTop: offset,
        visualBottom: offset + row.height,
        placementY: row.y,
        items: row.items,
        height: row.height
      })
      offset += row.height + GRID_GAP
    }
  } else {
    for (const row of dataRows) {
      visualRows.push({
        visualTop: row.y,
        visualBottom: row.y + row.height,
        placementY: row.y,
        items: row.items,
        height: row.height
      })
    }
  }

  return visualRows
}

const findTargetRowFromVisual = (mouseY, visualRows) => {
  if (visualRows.length === 0) return { placementY: 0, items: [], height: 0, isNewRow: true }

  const first = visualRows[0]
  if (mouseY < first.visualTop) {
    return { placementY: 0, items: [], height: first.height, isNewRow: true }
  }

  for (let i = 0; i < visualRows.length; i++) {
    const row = visualRows[i]
    if (mouseY >= row.visualTop && mouseY <= row.visualBottom) {
      return { placementY: row.placementY, items: row.items, height: row.height, isNewRow: row.items.length === 0 }
    }
    if (i < visualRows.length - 1) {
      const next = visualRows[i + 1]
      if (mouseY > row.visualBottom && mouseY < next.visualTop) {
        const gapCenter = (row.visualBottom + next.visualTop) / 2
        return mouseY < gapCenter ? { ...row } : { ...next }
      }
    }
  }

  const last = visualRows[visualRows.length - 1]
  return {
    placementY: last.placementY + last.height + GRID_GAP,
    items: [],
    height: 0,
    isNewRow: true
  }
}

const findBestPositionInRow = (mouseX, targetRow, elementWidth, gridWidth, excludeItemId) => {
  const rowItems = (targetRow.items || []).filter(item => !excludeItemId || item.id !== excludeItemId)
  const placementY = targetRow.placementY

  if (rowItems.length === 0) {
    const desiredX = mouseX - elementWidth / 2
    const clampedX = Math.max(0, Math.min(gridWidth - elementWidth, desiredX))
    return { x: clampedX, y: placementY }
  }

  const occupiedSegments = rowItems.map(item => {
    const actualSize = getActualItemSize(item)
    return {
      left: item.x || 0,
      right: (item.x || 0) + actualSize.width
    }
  }).sort((a, b) => a.left - b.left)

  const freeSegments = []
  let currentLeft = 0
  for (const segment of occupiedSegments) {
    const freeWidth = segment.left - GRID_GAP - currentLeft
    if (freeWidth >= elementWidth) {
      freeSegments.push({
        left: currentLeft,
        right: segment.left - GRID_GAP,
        width: freeWidth
      })
    }
    currentLeft = segment.right + GRID_GAP
  }
  if (gridWidth - currentLeft >= elementWidth) {
    freeSegments.push({
      left: currentLeft,
      right: gridWidth,
      width: gridWidth - currentLeft
    })
  }

  if (freeSegments.length > 0) {
    let bestX = 0
    let minDistance = Infinity
    for (const segment of freeSegments) {
      const desiredX = mouseX - elementWidth / 2
      const clampedX = Math.max(segment.left, Math.min(segment.right - elementWidth, desiredX))
      const distance = Math.abs(mouseX - (clampedX + elementWidth / 2))
      if (distance < minDistance) {
        minDistance = distance
        bestX = clampedX
      }
    }
    return { x: bestX, y: placementY }
  }

  const desiredX = mouseX - elementWidth / 2
  const clampedX = Math.max(0, Math.min(gridWidth - elementWidth, desiredX))
  return { x: clampedX, y: placementY }
}

const calculatePotentialPlacement = (mouseX, mouseY, elementType) => {
  if (!gridContainer.value) return { x: 0, y: 0 }
  const rect = gridContainer.value.getBoundingClientRect()
  const contentLeft = rect.left + GRID_CONTAINER_PADDING
  const contentTop = rect.top + GRID_CONTAINER_PADDING
  const relativeX = mouseX - contentLeft
  const relativeY = mouseY - contentTop
  const elementSize = getEffectiveElementSize(elementType)
  if (!elementSize) return { x: 0, y: 0 }
  const gridWidth = gridContainer.value.clientWidth

  if (localItems.value.length === 0) {
    const snapX = Math.max(0, Math.min(gridWidth - elementSize.width, relativeX - elementSize.width / 2))
    return { x: snapX, y: 0 }
  }

  const ph = yellowPlaceholderPosition.value
  const visualRows = buildVisualRows({
    items: localItems.value,
    excludeItemId: null,
    placeholderY: ph.y,
    placeholderHeight: ph.height || 0,
    elementHeight: elementSize.height
  })
  const targetRow = findTargetRowFromVisual(relativeY, visualRows)
  return findBestPositionInRow(relativeX, targetRow, elementSize.width, gridWidth, null)
}

const calculateFinalPlacement = (elementType) => {
  if (!yellowPlaceholderPosition.value || !elementType) {
    return { x: 0, y: 0 }
  }
  
  const placeholderX = yellowPlaceholderPosition.value.x
  const placeholderY = yellowPlaceholderPosition.value.y
  const elementSize = getEffectiveElementSize(elementType)
  
  if (!elementSize) return { x: 0, y: 0 }
  
  const hasItemsInRow = localItems.value.some(item => {
    const itemY = item.y || 0
    return Math.abs(itemY - placeholderY) < 10
  })
  
  if (hasItemsInRow && !checkCollision(placeholderX, placeholderY, elementSize.width, elementSize.height)) {
    return { x: placeholderX, y: placeholderY }
  }
  
  const elementsToShift = []
  
  localItems.value.forEach(item => {
    const itemY = item.y || 0
    const actualSize = getActualItemSize(item)
    const itemHeight = actualSize.height
    
    if (itemY >= placeholderY) {
      elementsToShift.push(item)
    }
    else if (itemY < placeholderY && itemY + itemHeight > placeholderY) {
      elementsToShift.push(item)
    }
  })
  
  elementsToShift.forEach(item => {
    const itemY = item.y || 0
    const actualSize = getActualItemSize(item)
    const itemHeight = actualSize.height
    
    if (itemY >= placeholderY) {
      item.y = itemY + elementSize.height + GRID_GAP
    } else {
      item.y = placeholderY + elementSize.height + GRID_GAP
    }
  })
  
  return { x: placeholderX, y: placeholderY }
}

const checkCollision = (x, y, width, height, excludeItemId) => {
  const occupiedAreas = localItems.value
    .filter(item => !excludeItemId || item.id !== excludeItemId)
    .map(item => {
      const actualSize = getActualItemSize(item)
      return {
        left: item.x || 0,
        top: item.y || 0,
        right: (item.x || 0) + actualSize.width,
        bottom: (item.y || 0) + actualSize.height
      }
    })
  
  const newArea = {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height
  }
  
  return occupiedAreas.some(area => 
    newArea.left < area.right + GRID_GAP &&
    newArea.right > area.left - GRID_GAP &&
    newArea.top < area.bottom + GRID_GAP &&
    newArea.bottom > area.top - GRID_GAP
  )
}

const handleMouseDown = (item, event) => {
  if (props.viewMode || event.button !== 0) return

  isMouseDown.value = true
  
  const startX = event.clientX
  const startY = event.clientY
  
  const handleMouseMove = (moveEvent) => {
    const deltaX = Math.abs(moveEvent.clientX - startX)
    const deltaY = Math.abs(moveEvent.clientY - startY)
    
    if (deltaX > 5 || deltaY > 5) {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      startDrag(item, moveEvent)
    }
  }
  
  const handleMouseUp = () => {
    isMouseDown.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const startDrag = (item, event) => {
  event.preventDefault()
  draggedItem.value = item
  isDraggingExisting.value = true

  const rect = gridContainer.value.getBoundingClientRect()
  const itemWidth = item.width || ELEMENT_SIZES[item.type]?.width || 200
  const itemHeight = item.height || ELEMENT_SIZES[item.type]?.height || 150
  draggedElementCursorOffset.value = {
    x: itemWidth / 2,
    y: itemHeight / 2
  }
  draggedElementCursorPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  dragOffset.value = {
    x: event.clientX - rect.left - (item.x || 0),
    y: event.clientY - rect.top - (item.y || 0)
  }
  document.addEventListener('mousemove', handleExistingItemDrag)
  document.addEventListener('mouseup', stopDrag)
}

const handleExistingItemDrag = (event) => {
  if (!draggedItem.value || !gridContainer.value) return
  draggedElementCursorPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  const rect = gridContainer.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left - GRID_CONTAINER_PADDING
  const mouseY = event.clientY - rect.top - GRID_CONTAINER_PADDING
  const actualSize = getActualItemSize(draggedItem.value)
  const itemWidth = actualSize.width
  const itemHeight = actualSize.height
  const gridWidth = gridContainer.value.clientWidth

  const otherItems = localItems.value.filter(item => item.id !== draggedItem.value.id)

  if (otherItems.length === 0) {
    const snapX = Math.max(0, Math.min(gridWidth - itemWidth, mouseX - itemWidth / 2))
    yellowPlaceholderPosition.value = {
      x: snapX,
      y: 0,
      width: itemWidth,
      height: itemHeight
    }
    showYellowPlaceholder.value = true
    return
  }

  const ph = yellowPlaceholderPosition.value
  const visualRows = buildVisualRows({
    items: localItems.value,
    excludeItemId: draggedItem.value.id,
    placeholderY: ph.y,
    placeholderHeight: ph.height || 0,
    elementHeight: itemHeight
  })
  const targetRow = findTargetRowFromVisual(mouseY, visualRows)
  const placement = findBestPositionInRow(mouseX, targetRow, itemWidth, gridWidth, draggedItem.value.id)

  yellowPlaceholderPosition.value = {
    x: placement.x,
    y: placement.y,
    width: itemWidth,
    height: itemHeight
  }
  showYellowPlaceholder.value = true
}

const stopDrag = () => {
  if (draggedItem.value && isDraggingExisting.value) {
    if (showYellowPlaceholder.value && yellowPlaceholderPosition.value) {
      const newX = yellowPlaceholderPosition.value.x
      const newY = yellowPlaceholderPosition.value.y
      
      const isPlacingInExistingRow = localItems.value.some(item => {
        if (item.id === draggedItem.value.id) return false
        const itemY = item.y || 0
        return Math.abs(itemY - newY) < 10
      })
      
      draggedItem.value.x = newX
      draggedItem.value.y = newY
      
      if (!isPlacingInExistingRow) {
        const rows = new Map()
        for (const item of localItems.value) {
          const itemY = item.y || 0
          let foundRow = false
          for (const [rowY] of rows) {
            if (Math.abs(rowY - itemY) < 10) {
              rows.get(rowY).push(item)
              foundRow = true
              break
            }
          }
          if (!foundRow) {
            rows.set(itemY, [item])
          }
        }
        
        const sortedRowYs = [...rows.keys()].sort((a, b) => a - b)
        let currentY = 0
        
        for (const rowY of sortedRowYs) {
          const rowItems = rows.get(rowY)
          let maxHeight = 0
          
          for (const item of rowItems) {
            item.y = currentY
            const actualSize = getActualItemSize(item)
            maxHeight = Math.max(maxHeight, actualSize.height)
          }
          
          currentY += maxHeight + GRID_GAP
        }
      }
    }
    emit('update:items', localItems.value)
  }
  draggedItem.value = null
  isDraggingExisting.value = false
  isMouseDown.value = false
  showYellowPlaceholder.value = false
  draggedElementCursorPosition.value = { x: 0, y: 0 }
  document.removeEventListener('mousemove', handleExistingItemDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const startResize = (item, direction, event) => {
  event.preventDefault()
  event.stopPropagation()
  
  resizingItem.value = item
  resizeDirection.value = direction
  resizeStartPos.value = { x: event.clientX, y: event.clientY }
  resizeStartSize.value = { 
    width: item.width || ELEMENT_SIZES[item.type]?.width || 200,
    height: item.height || ELEMENT_SIZES[item.type]?.height || 150
  }
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (event) => {
  if (!resizingItem.value) return
  
  const deltaX = event.clientX - resizeStartPos.value.x
  const deltaY = event.clientY - resizeStartPos.value.y
  
  let newWidth = resizeStartSize.value.width
  let newHeight = resizeStartSize.value.height
  let newX = resizingItem.value.x || 0
  let newY = resizingItem.value.y || 0
  
  const gridWidth = gridContainer.value
    ? gridContainer.value.clientWidth
    : resizeStartSize.value.width + GRID_PADDING * 2
  
  if (resizeDirection.value === 'e') {
    newWidth = Math.max(100, resizeStartSize.value.width + deltaX)
    if (newX + newWidth > gridWidth - GRID_PADDING * 2) {
      newWidth = gridWidth - GRID_PADDING * 2 - newX
    }
  }
  if (resizeDirection.value === 'w') {
    newWidth = Math.max(100, resizeStartSize.value.width - deltaX)
    newX = (resizingItem.value.x || 0) + deltaX
    if (newX < GRID_PADDING) {
      newX = GRID_PADDING
      newWidth = resizeStartSize.value.width + (resizingItem.value.x || 0) - GRID_PADDING
    }
  }
  if (resizeDirection.value === 's') {
    newHeight = Math.max(50, resizeStartSize.value.height + deltaY)
  }
  
  if (!checkCollision(newX, newY, newWidth, newHeight, resizingItem.value.id)) {
    resizingItem.value.width = newWidth
    resizingItem.value.height = newHeight
    resizingItem.value.x = newX
    resizingItem.value.y = newY
  }
}

const stopResize = () => {
  if (resizingItem.value) {
    emit('update:items', localItems.value)
  }
  
  resizingItem.value = null
  resizeDirection.value = ''
  
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

const handleDragEnter = (event) => {
  if (props.viewMode) return
  event.preventDefault()
  isDragOver.value = true

  if (props.draggedType && !isDraggingExisting.value) {
    currentDraggedType.value = props.draggedType
    showGrayPlaceholder.value = true
    showYellowPlaceholder.value = true
    
    grayPlaceholderPosition.value = {
      x: event.clientX,
      y: event.clientY
    }
    
    const position = calculatePotentialPlacement(event.clientX, event.clientY, currentDraggedType.value)
    const size = getEffectiveElementSize(currentDraggedType.value)
    
    if (size) {
      yellowPlaceholderPosition.value = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height
      }
    }
  }
}

const updatePlacementFromDrag = (clientX, clientY) => {
  if (!gridContainer.value || !currentDraggedType.value || isDraggingExisting.value) return
  const size = getEffectiveElementSize(currentDraggedType.value)
  if (!size) return

  grayPlaceholderPosition.value = { x: clientX, y: clientY }
  const position = calculatePotentialPlacement(clientX, clientY, currentDraggedType.value)
  yellowPlaceholderPosition.value = {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height
  }
}

const onDocumentDragOver = (event) => {
  if (props.viewMode || !currentDraggedType.value || isDraggingExisting.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  updatePlacementFromDrag(event.clientX, event.clientY)
}

const onDocumentMouseMove = (event) => {
  if (!currentDraggedType.value || isDraggingExisting.value || !gridContainer.value) return
  if (!showYellowPlaceholder.value) return
  const rect = gridContainer.value.getBoundingClientRect()
  if (event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom) {
    updatePlacementFromDrag(event.clientX, event.clientY)
  }
}

const handleDragOver = (event) => {
  if (props.viewMode) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  if (currentDraggedType.value && !isDraggingExisting.value) {
    updatePlacementFromDrag(event.clientX, event.clientY)
  }
}

const handleDrop = (event) => {
  if (props.viewMode) return
  event.preventDefault()

  let itemType = currentDraggedType.value || event.dataTransfer.getData('text/plain')
  
  if (itemType && ELEMENT_SIZES[itemType] && !isDraggingExisting.value) {
    const position = calculateFinalPlacement(itemType)
    const effectiveSize = getEffectiveElementSize(itemType)
    if (!effectiveSize) return
    const size = { ...effectiveSize }
    
    if (!checkCollision(position.x, position.y, size.width, size.height)) {
      const newItem = {
        id: Date.now() + Math.random(),
        type: itemType,
        selected: false,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height
      }
      
      if (itemType === 'Чарт') {
        newItem.chartsList = [
          {
            id: 1,
            title: 'Заголовок 1',
            selectedChart: '',
            selectedChartId: null,
            chartType: 'select',
            chartUrl: '',
            description: '',
            hintText: '',
            showDescription: false,
            hint: false,
            autoHeight: false,
            isFavorite: true
          }
        ]
        newItem.activeChartIndex = 0
      }
      
      if (itemType === 'Селектор') {
        newItem.selectorsList = [
          {
            id: 1,
            title: 'Селектор 1',
            titlePosition: 'left',
            showInternalTitle: true,
            internalTitle: 'Выберите значение из списка',
            showColorAccent: true,
            showHint: false,
            hintText: '',
            sourceType: 'dataset',
            selectedDataset: '',
            selectedDatasetId: null,
            selectedField: '',
            selectorType: 'list',
            operation: '',
            multipleSelection: false,
            defaultValue: [],
            required: false,
            isFavorite: true
          }
        ]
        newItem.activeSelectorIndex = 0
        newItem.selectorGroupSettings = {
          applyButton: true,
          clearButton: true,
          autoHeight: false
        }
      }
      
      localItems.value.push(newItem)
      emit('update:items', localItems.value)
      emit('item-edit', newItem)
    }
  }
  
  resetDragState()
}

const resetDragState = () => {
  if (documentDragOverListenerAttached.value) {
    document.removeEventListener('dragover', onDocumentDragOver, false)
    documentDragOverListenerAttached.value = false
  }
  if (documentMouseMoveListenerAttached.value) {
    document.removeEventListener('mousemove', onDocumentMouseMove, false)
    documentMouseMoveListenerAttached.value = false
  }
  isDragOver.value = false
  showGrayPlaceholder.value = false
  showYellowPlaceholder.value = false
  currentDraggedType.value = ''
  grayPlaceholderPosition.value = { x: 0, y: 0 }
  yellowPlaceholderPosition.value = { x: 0, y: 0, width: 0, height: 0 }
}

const getActualItemSize = (item) => {
  let actualHeight = item.height || ELEMENT_SIZES[item.type]?.height || 150;
  
  if (item.autoHeight && autoHeightItems.value.has(item.id)) {
    const savedHeight = autoHeightItems.value.get(item.id);
    actualHeight = savedHeight;
  }
  
  return {
    width: item.width || ELEMENT_SIZES[item.type]?.width || 200,
    height: actualHeight
  }
}

const existingRowLines = computed(() => {
  const list = localItems.value
  if (list.length === 0) return []
  const dataRows = []
  for (const item of list) {
    const itemY = item.y || 0
    const actualSize = getActualItemSize(item)
    const existing = dataRows.find(r => Math.abs(r.y - itemY) < 10)
    if (existing) {
      existing.height = Math.max(existing.height, actualSize.height)
    } else {
      dataRows.push({ y: itemY, height: actualSize.height })
    }
  }
  dataRows.sort((a, b) => a.y - b.y)
  const lines = [0]
  dataRows.forEach(row => {
    lines.push(row.y + row.height + GRID_GAP)
  })
  return lines
})

const recalculatePositions = () => {
  if (isRecalculatingPositions.value || localItems.value.length === 0) {
    return;
  }
  
  isRecalculatingPositions.value = true
  
  nextTick(() => {
    const rows = new Map()
    
    for (const item of localItems.value) {
      const itemY = item.y || 0
      let foundRow = false
      
      for (const [rowY] of rows) {
        if (Math.abs(rowY - itemY) < 10) {
          rows.get(rowY).push(item)
          foundRow = true
          break
        }
      }
      
      if (!foundRow) {
        rows.set(itemY, [item])
      }
    }
    
    const sortedRowYs = [...rows.keys()].sort((a, b) => a - b)
    let currentY = 0
    
    for (const rowY of sortedRowYs) {
      const rowItems = rows.get(rowY)
      let maxHeight = 0
      
      for (const item of rowItems) {
        item.y = currentY
        const actualSize = getActualItemSize(item)
        maxHeight = Math.max(maxHeight, actualSize.height)
      }
      
      currentY += maxHeight + GRID_GAP
    }
    
    emit('update:items', localItems.value)
    isRecalculatingPositions.value = false
  })
}

const handleItemResize = (entries) => {
  let hasChanges = false
  
  for (const entry of entries) {
    const itemId = entry.target.getAttribute('data-item-id')
    const item = localItems.value.find(i => i.id === itemId)
    
    if (item && item.autoHeight) {
      const newHeight = entry.contentRect.height
      const storedHeight = autoHeightItems.value.get(itemId)
      
      if (storedHeight !== newHeight) {
        autoHeightItems.value.set(itemId, newHeight)
        hasChanges = true
      }
    }
  }
  
  if (hasChanges) {
    recalculatePositions()
  }
}

const setupResizeObserver = (element, item) => {
  if (item.autoHeight && resizeObserver.value) {
    element.setAttribute('data-item-id', item.id)
    resizeObserver.value.observe(element)
    
    nextTick(() => {
      const rect = element.getBoundingClientRect()
      autoHeightItems.value.set(item.id, rect.height)
    })
  }
}

const removeResizeObserver = (item) => {
  if (resizeObserver.value) {
    const element = document.querySelector(`[data-item-id="${item.id}"]`)
    if (element) {
      resizeObserver.value.unobserve(element)
    }
    autoHeightItems.value.delete(item.id)
  }
}

const handleMouseMove = (event) => {
  if (showGrayPlaceholder.value && currentDraggedType.value && !isDraggingExisting.value) {
    grayPlaceholderPosition.value = {
      x: event.clientX,
      y: event.clientY
    }
    
    if (gridContainer.value) {
      const rect = gridContainer.value.getBoundingClientRect()
      if (event.clientX >= rect.left && event.clientX <= rect.right && 
          event.clientY >= rect.top && event.clientY <= rect.bottom) {
        const position = calculatePotentialPlacement(event.clientX, event.clientY, currentDraggedType.value)
        const size = ELEMENT_SIZES[currentDraggedType.value]
        
        yellowPlaceholderPosition.value = {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height
        }
      }
    }
  }
}

const handleDragLeave = (event) => {
  if (props.viewMode) return
  if (!event.currentTarget.contains(event.relatedTarget)) {
    showGrayPlaceholder.value = false
    showYellowPlaceholder.value = false
    grayPlaceholderPosition.value = { x: 0, y: 0 }
    yellowPlaceholderPosition.value = { x: 0, y: 0, width: 0, height: 0 }
  }
}

watch(() => props.items, (newItems) => {
  if (JSON.stringify(localItems.value) !== JSON.stringify(newItems)) {
    localItems.value = [...newItems]
  }
}, { deep: true, immediate: true })

watch(localItems, (newItems, oldItems) => {
  if (!resizeObserver.value) return
  
  nextTick(() => {
    oldItems.forEach(oldItem => {
      const stillExists = newItems.find(newItem => newItem.id === oldItem.id)
      if (!stillExists) {
        removeResizeObserver(oldItem)
      }
    })
    
    newItems.forEach(newItem => {
      if (newItem.height === 'auto') {
        const element = document.querySelector(`[data-item-id="${newItem.id}"]`)
        if (element && !autoHeightItems.value.has(newItem.id)) {
          setupResizeObserver(element, newItem)
        }
      } else {
        removeResizeObserver(newItem)
      }
    })
    
    const hasAutoHeightItems = newItems.some(item => item.height === 'auto')
    if (hasAutoHeightItems) {
      setTimeout(() => {
        recalculatePositions()
      }, 100)
    }
  })
}, { deep: true })

watch(() => props.draggedType, (newType) => {
  if (newType && ELEMENT_SIZES[newType] && !isDraggingExisting.value) {
    currentDraggedType.value = newType
    showGrayPlaceholder.value = true
    if (isDragOver.value) {
      showYellowPlaceholder.value = true
    }
    if (!documentDragOverListenerAttached.value) {
      document.addEventListener('dragover', onDocumentDragOver, false)
      documentDragOverListenerAttached.value = true
    }
    if (!documentMouseMoveListenerAttached.value) {
      document.addEventListener('mousemove', onDocumentMouseMove, false)
      documentMouseMoveListenerAttached.value = true
    }
  } else if (!newType) {
    resetDragState()
  }
}, { immediate: true })

const triggerRecalculatePositions = () => {
  nextTick(() => {
    recalculatePositions()
  })
}

defineExpose({
  triggerRecalculatePositions
})

onMounted(() => {
  localItems.value.forEach((item, index) => {
    if (item.x === undefined || item.y === undefined) {
      const size = ELEMENT_SIZES[item.type] || { width: 200, height: 150 }
      item.x = 0
      item.y = index * (size.height + GRID_GAP)
      if (!item.width) item.width = size.width
      if (!item.height) item.height = size.height
    }
  })
  
  if (localItems.value.length > 0) {
    emit('update:items', localItems.value)
  }

  resizeObserver.value = new ResizeObserver(handleItemResize)
  
  nextTick(() => {
    localItems.value.forEach(item => {
      if (item.height === 'auto') {
        const element = document.querySelector(`[data-item-id="${item.id}"]`)
        if (element) {
          setupResizeObserver(element, item)
        }
      }
    })
  })
})

onUnmounted(() => {
  if (documentDragOverListenerAttached.value) {
    document.removeEventListener('dragover', onDocumentDragOver, false)
    documentDragOverListenerAttached.value = false
  }
  if (documentMouseMoveListenerAttached.value) {
    document.removeEventListener('mousemove', onDocumentMouseMove, false)
    documentMouseMoveListenerAttached.value = false
  }
  document.removeEventListener('mousemove', handleExistingItemDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
    resizeObserver.value = null
  }
  autoHeightItems.value.clear()
})
</script>

<style scoped lang="scss">
.dashboard-grid {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 200px);
  overflow: hidden;
}

.empty-grid {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &.drag-over {
    border-color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.05);
  }
}

.empty-content {
  text-align: center;
  color: var(--color-text-secondary);
  
  h3 {
    margin: 15px 0 10px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    max-width: 400px;
  }
}

.grid-container {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 200px);
  padding: 20px;
}

.grid-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  --grid-step: 10px;
  --grid-color: rgba(var(--color-primary-rgb, 59, 130, 246), 0.12);
  background-image:
    linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
  background-size: var(--grid-step) var(--grid-step);
}

.grid-rows-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.grid-row-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(var(--color-primary-rgb, 59, 130, 246), 0.35);
}

.hint-tooltip {
  position: fixed;
  background: var(--color-primary-background);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px;
  white-space: normal;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  font-size: 13px;
  max-width: 300px;
  overflow-wrap: break-word;

  :deep(p) {
    margin-bottom: 0;
  }
}

.gray-placeholder {
  background: rgba(128, 128, 128, 0.7);
  border: 2px solid rgba(64, 64, 64, 0.9);
  border-radius: 8px;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
  pointer-events: none;
}

.yellow-placeholder {
  background: rgba(255, 193, 7, 0.15);
  border: 3px dashed rgba(255, 193, 7, 0.8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  
  &::before {
    content: '';
    position: absolute;
    inset: 4px;
    background: rgba(255, 193, 7, 0.08);
    border-radius: 4px;
  }
  
  .placeholder-content {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 140, 0, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    position: relative;
    z-index: 1;
    background: rgba(255, 255, 255, 0.9);
    padding: 8px 16px;
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
  }
}
.dragged-element-preview {
  pointer-events: none;
  opacity: 0.85;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-primary-background);
  transition: box-shadow 0.2s, opacity 0.2s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2000;
}

.dragged-item-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(45, 45, 61, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10;
  border-radius: 8px 8px 0 0;
}

.dragged-item-type {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.dragged-item-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 28px;
  overflow: hidden;
}

.dragged-item-preview {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.hint-content {
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
}
</style> 