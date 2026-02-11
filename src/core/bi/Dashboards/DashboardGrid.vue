<template>
  <div
    class="dashboard-grid"
    :class="{ 'view-mode': viewMode }"
    :style="dashboardGridStyle"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @mousemove="handleMouseMove"
    ref="gridContainer"
  >
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
        :ref="el => setItemRef(item.id, el)"
        :item="item"
        :resolved-height="resolvedHeightsMap[item.id]"
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
        ref="previewContainerRef"
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
          background: 'var(--color-primary-background)',
          overflow: 'hidden'
        }"
        class="dragged-element-preview"
      ></div>
    </Teleport>

    <Teleport to="body">
      <div v-if="hintVisible" class="hint-tooltip"  :style="hintTooltipStyle" @mouseenter="cancelHideHint" @mouseleave="hideHint">
        <div v-html="hintContent" class="hint-content"></div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, Teleport } from 'vue'
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
const placeholderInsertionMode = ref('sameRow')
const placeholderIsNewRowAtTop = ref(false)
const currentDraggedType = ref('')
const draggedItem = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const isDraggingExisting = ref(false)
const resizingItem = ref(null)
const resizeStartPos = ref({ x: 0, y: 0 })
const resizeStartSize = ref({ width: 0, height: 0 })
const resizeDirection = ref('')
const resizeStartItemPos = ref({ x: 0, y: 0 })
const resizeStartRightEdge = ref(0)
const draggedElementCursorOffset = ref({ x: 0, y: 0 })
const draggedElementCursorPosition = ref({ x: 0, y: 0 })
const isMouseDown = ref(false)
const hintVisible = ref(false)
const hintContent = ref('')
const hintTooltipStyle = ref({})
let hideHintTimer = null
const resizeObserver = ref(null)
const autoHeightItems = ref(new Map())
const renderedHeights = ref(new Map())
const observedRenderedIds = ref(new Set())
const isRecalculatingPositions = ref(false)
const documentDragOverListenerAttached = ref(false)
const documentMouseMoveListenerAttached = ref(false)
const gridContentHeight = ref(0)
const dragStartSnapshot = ref(null)
const itemRefs = ref({})
const previewContainerRef = ref(null)

const setItemRef = (id, el) => {
  if (el) itemRefs.value[id] = el
  else delete itemRefs.value[id]
}

const dashboardGridStyle = computed(() => {
  if (!gridContentHeight.value) {
    return {}
  }

  const extraSpace = props.viewMode ? 0 : 300
  const totalHeight = gridContentHeight.value + extraSpace

  return {
    height: `${totalHeight}px`
  }
})

const updateGridContentHeight = () => {
  if (!localItems.value.length) {
    gridContentHeight.value = 0
    return
  }

  let maxBottom = 0
  for (const item of localItems.value) {
    const size = getActualItemSize(item)
    const bottom = (item.y || 0) + size.height
    if (bottom > maxBottom) {
      maxBottom = bottom
    }
  }
  gridContentHeight.value = maxBottom
}

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
    left: `${p.x ?? 0}px`,
    top: `${p.y ?? 0}px`,
    width: `${p.width ?? 0}px`,
    height: `${p.height ?? 0}px`,
    pointerEvents: 'none'
  }
})

const shiftedItemsStyle = computed(() => {
  if (!showYellowPlaceholder.value) return {}
  if (isDraggingExisting.value) return {}
  const placeholderY = yellowPlaceholderPosition.value.y
  if (placeholderY !== 0 || !placeholderIsNewRowAtTop.value) return {}
  const placeholderHeight = yellowPlaceholderPosition.value.height || 0
  const shiftAmount = placeholderHeight + GRID_GAP
  const styles = {}
  localItems.value.forEach(item => {
    const itemY = item.y || 0
    if (itemY >= placeholderY) {
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
    item.height = newHeight;
    autoHeightItems.value.set(item.id, newHeight);
    autoHeightItems.value = new Map(autoHeightItems.value);
    nextTick(() => {
      recalculatePositions();
    });
  }
}

const handleSelectorSelectionChange = (item, selectionData) => {}

const handleSelectorResize = (item, newHeight) => {
  const isAutoHeight = item.autoHeight || item.selectorGroupSettings?.autoHeight;
  
  if (isAutoHeight) {
    item.height = newHeight;
    autoHeightItems.value.set(item.id, newHeight);
    autoHeightItems.value = new Map(autoHeightItems.value);
    nextTick(() => {
      recalculatePositions();
    });
  }
}

const handleSelectorApplyFilters = (item, event) => {}

const handleSelectorClearFilters = (item, event) => {}

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

  const firstRowAtTop = dataRows.length > 0 && (dataRows[0].y || 0) < 10
  const placeholderAtTop = placeholderY < 10 && (placeholderHeight > 0 || elementHeight > 0) && !firstRowAtTop
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

  // Новая строка сверху только когда курсор строго выше верхней границы первой строки (не на виджете).
  // Если курсор на самом элементе — ниже попадём в цикл и предложим место в этой строке (рядом с элементом).
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
        // Пользователь перетаскивает элемент в "зазор" между строками:
        // всегда создаём новую строку между ними.
        const insertionY = row.placementY + row.height + GRID_GAP
        return {
          placementY: insertionY,
          items: [],
          height: 0,
          isNewRow: true
        }
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

const findBestPositionInRow = (mouseX, relativeY, targetRow, elementWidth, elementHeight, gridWidth, excludeItemId) => {
  const rowItems = (targetRow.items || []).filter(item => !excludeItemId || item.id !== excludeItemId)
  const placementY = targetRow.placementY
  const rowHeight = targetRow.height || 0
  const desiredX = Math.max(0, Math.min(gridWidth - elementWidth, mouseX - elementWidth / 2))

  if (rowItems.length === 0) {
    return { x: desiredX, y: placementY }
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
      const clampedX = Math.max(segment.left, Math.min(segment.right - elementWidth, mouseX - elementWidth / 2))
      const distance = Math.abs(mouseX - (clampedX + elementWidth / 2))
      if (distance < minDistance) {
        minDistance = distance
        bestX = clampedX
      }
    }
    return { x: bestX, y: placementY }
  }

  const rowMiddle = placementY + rowHeight / 2
  if (relativeY < rowMiddle) {
    const newY = Math.max(0, placementY - GRID_GAP - elementHeight)
    return { x: desiredX, y: newY }
  }
  return { x: desiredX, y: placementY + rowHeight + GRID_GAP }
}

const findItemUnderCursor = (relativeX, relativeY, rowItems, excludeItemId) => {
  for (const item of rowItems) {
    if (excludeItemId && item.id === excludeItemId) continue
    const size = getActualItemSize(item)
    const left = item.x || 0
    const top = item.y || 0
    const right = left + size.width
    const bottom = top + size.height
    if (relativeX >= left && relativeX <= right && relativeY >= top && relativeY <= bottom) {
      return { item, top, bottom, left, right }
    }
  }
  return null
}

const computePlacementForDrag = (relativeX, relativeY, elementType, excludeItemId = null, sizeOverride = null) => {
  if (!gridContainer.value) return { x: 0, y: 0, width: 0, height: 0, insertionMode: 'sameRow', isNewRowAtTop: false }

  const elementSize = sizeOverride || getEffectiveElementSize(elementType)
  if (!elementSize) return { x: 0, y: 0, width: 0, height: 0, insertionMode: 'sameRow', isNewRowAtTop: false }

  const gridWidth = gridContainer.value.clientWidth

  const itemsForPlacement = excludeItemId
    ? localItems.value.filter(item => item.id !== excludeItemId)
    : localItems.value

  if (itemsForPlacement.length === 0) {
    const snapX = Math.max(0, Math.min(gridWidth - elementSize.width, relativeX - elementSize.width / 2))
    return { x: snapX, y: 0, width: elementSize.width, height: elementSize.height, insertionMode: 'above', isNewRowAtTop: true }
  }

  const ph = yellowPlaceholderPosition.value
  const visualRows = buildVisualRows({
    items: localItems.value,
    excludeItemId,
    placeholderY: ph.y,
    placeholderHeight: ph.height || 0,
    elementHeight: elementSize.height
  })
  const targetRow = findTargetRowFromVisual(relativeY, visualRows)
  let placement = findBestPositionInRow(
    relativeX,
    relativeY,
    targetRow,
    elementSize.width,
    elementSize.height,
    gridWidth,
    excludeItemId
  )
  let insertionMode = 'sameRow'

  if (targetRow.items && targetRow.items.length > 0) {
    const over = findItemUnderCursor(relativeX, relativeY, targetRow.items, excludeItemId)
    if (over) {
      const itemMiddle = over.top + (over.bottom - over.top) / 2
      if (relativeY < itemMiddle) {
        const rawY = targetRow.placementY - elementSize.height - GRID_GAP
        const clampedY = Math.max(0, rawY)
        placement = {
          x: over.left,
          y: clampedY
        }
        insertionMode = 'above'
      } else {
        placement = {
          x: over.left,
          y: targetRow.placementY + (targetRow.height || 0) + GRID_GAP
        }
        insertionMode = 'below'
      }
    }
  }

  const adjusted =
    insertionMode === 'above' || insertionMode === 'below'
      ? { x: placement.x, y: placement.y }
      : adjustPlacementToAvoidCollision(
          placement.x,
          placement.y,
          elementSize.width,
          elementSize.height,
          excludeItemId
        )

  let finalY = adjusted.y
  const firstRowItems = itemsForPlacement.filter(i => (i.y || 0) < 10)
  if (firstRowItems.length > 0 && insertionMode === 'above') {
    const firstRowBottom = Math.max(
      ...firstRowItems.map(i => (i.y || 0) + getActualItemSize(i).height)
    )
    const minY = firstRowBottom + GRID_GAP
    if (finalY < minY) {
      finalY = minY
    }
  }

  const isNewRowAtTop = insertionMode === 'above' && finalY === 0
  return {
    x: adjusted.x,
    y: finalY,
    width: elementSize.width,
    height: elementSize.height,
    insertionMode,
    isNewRowAtTop
  }
}

const calculatePotentialPlacement = (mouseX, mouseY, elementType) => {
  if (!gridContainer.value) return { x: 0, y: 0, isNewRowAtTop: false, insertionMode: 'sameRow' }
  const rect = gridContainer.value.getBoundingClientRect()
  const contentLeft = rect.left + GRID_CONTAINER_PADDING
  const contentTop = rect.top + GRID_CONTAINER_PADDING
  const relativeX = mouseX - contentLeft
  const relativeY = mouseY - contentTop

  const placement = computePlacementForDrag(relativeX, relativeY, elementType, null)
  return {
    x: placement.x,
    y: placement.y,
    isNewRowAtTop: placement.isNewRowAtTop ?? false,
    insertionMode: placement.insertionMode ?? 'sameRow'
  }
}

const calculateFinalPlacement = (elementType) => {
  if (!yellowPlaceholderPosition.value || !elementType) return { x: 0, y: 0 }
  if (!getEffectiveElementSize(elementType)) return { x: 0, y: 0 }
  const ph = yellowPlaceholderPosition.value
  return { x: ph.x, y: ph.y }
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

const adjustPlacementToAvoidCollision = (x, y, width, height, excludeItemId) => {
  let currentY = y
  const maxIterations = 30
  for (let i = 0; i < maxIterations; i++) {
    if (!checkCollision(x, currentY, width, height, excludeItemId)) {
      return { x, y: currentY }
    }
    let maxBottom = 0
    for (const item of localItems.value) {
      if (excludeItemId && item.id === excludeItemId) continue
      const size = getActualItemSize(item)
      const itemTop = item.y || 0
      const itemBottom = itemTop + size.height
      const itemLeft = item.x || 0
      const itemRight = itemLeft + size.width
      const overlaps = (
        x < itemRight + GRID_GAP &&
        x + width > itemLeft - GRID_GAP &&
        currentY < itemBottom + GRID_GAP &&
        currentY + height > itemTop - GRID_GAP
      )
      if (overlaps && itemBottom > maxBottom) {
        maxBottom = itemBottom
      }
    }
    if (maxBottom === 0) break
    currentY = maxBottom + GRID_GAP
  }
  return { x, y: currentY }
}

const getMaxRightEdgeForResize = (itemY, currentRight, gridWidth, excludeItemId) => {
  const rowItems = localItems.value.filter(
    (i) => i.id !== excludeItemId && Math.abs((i.y || 0) - itemY) < 10 && (i.x || 0) >= currentRight
  )
  if (rowItems.length === 0) return gridWidth

  rowItems.sort((a, b) => (a.x || 0) - (b.x || 0))

  let maxAllowedRight = gridWidth
  let totalWidth = 0
  for (let k = 0; k < rowItems.length; k++) {
    const size = getActualItemSize(rowItems[k])
    totalWidth += size.width
    const gapsCount = k + 1
    const limit = gridWidth - gapsCount * GRID_GAP - totalWidth
    if (limit < maxAllowedRight) maxAllowedRight = limit
  }
  return Math.max(currentRight, maxAllowedRight)
}

const pushNeighborsRight = (resizingItem, newRight, ourStartRight) => {
  const itemY = resizingItem.y || 0
  const rowItems = localItems.value.filter(
    (i) =>
      i.id !== resizingItem.id &&
      Math.abs((i.y || 0) - itemY) < 10 &&
      (i.x || 0) >= ourStartRight &&
      (i.x || 0) < newRight + GRID_GAP
  )
  if (rowItems.length === 0) return

  rowItems.sort((a, b) => (a.x || 0) - (b.x || 0))

  let requiredLeft = newRight + GRID_GAP
  for (const item of rowItems) {
    const itemLeft = item.x || 0
    if (itemLeft < requiredLeft) {
      item.x = requiredLeft
    }
    const size = getActualItemSize(item)
    requiredLeft = (item.x || 0) + size.width + GRID_GAP
  }
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
  dragStartSnapshot.value = localItems.value.map(i => ({ id: i.id, x: i.x || 0, y: i.y || 0 }))

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
  document.addEventListener('mouseup', stopDrag, true)

  nextTick(() => {
    const container = previewContainerRef.value
    const raw = itemRefs.value[item.id]
    const comp = Array.isArray(raw) ? raw[0] : raw
    const el = comp?.$el ?? comp
    if (!container || !el?.cloneNode) return
    const clone = el.cloneNode(true)
    clone.classList.remove('item-hidden-drag', 'item-dragging')
    clone.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;margin:0;box-sizing:border-box;opacity:1;'
    container.innerHTML = ''
    container.appendChild(clone)
  })
}

const restoreSnapshot = () => {
  if (!dragStartSnapshot.value) return
  for (const s of dragStartSnapshot.value) {
    const item = localItems.value.find(i => i.id === s.id)
    if (item) {
      item.x = s.x
      item.y = s.y
    }
  }
}

const applyShiftDuringDrag = (placeholderY, placeholderHeight, mode, excludeItemId) => {
  const shiftAmount = placeholderHeight + GRID_GAP
  let shiftedCount = 0
  if (mode === 'above') {
    localItems.value.forEach((item) => {
      if (item.id !== excludeItemId && (item.y || 0) >= placeholderY) {
        item.y = (item.y || 0) + shiftAmount
        shiftedCount += 1
      }
    })
  } else if (mode === 'below') {
    const rowBelowThreshold = placeholderY + placeholderHeight + GRID_GAP
    localItems.value.forEach((item) => {
      if (item.id !== excludeItemId && (item.y || 0) >= rowBelowThreshold) {
        item.y = (item.y || 0) + shiftAmount
        shiftedCount += 1
      }
    })
  }
}

const handleExistingItemDrag = (event) => {
  if (!draggedItem.value || !gridContainer.value || !dragStartSnapshot.value) return
  draggedElementCursorPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  restoreSnapshot()
  const rect = gridContainer.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left - GRID_CONTAINER_PADDING
  const mouseY = event.clientY - rect.top - GRID_CONTAINER_PADDING

  let draggedSize = getActualItemSize(draggedItem.value)
  const domEl = getItemElement(draggedItem.value.id)
  if (domEl) {
    const dr = domEl.getBoundingClientRect()
    if (dr.width > 0 && dr.height > 0) {
      draggedSize = { width: Math.round(dr.width), height: Math.round(dr.height) }
    }
  }
  const placement = computePlacementForDrag(mouseX, mouseY, draggedItem.value.type, draggedItem.value.id, draggedSize)
  const mode = placement.insertionMode ?? 'sameRow'
  if (mode === 'above' || mode === 'below') {
    applyShiftDuringDrag(placement.y, placement.height || draggedSize.height, mode, draggedItem.value.id)
  }

  yellowPlaceholderPosition.value = {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height
  }
  placeholderInsertionMode.value = mode
  showYellowPlaceholder.value = true
}

const stopDrag = (event) => {
  const isDropInsideGrid = event && gridContainer.value && gridContainer.value.contains(event.target)
  if (draggedItem.value && isDraggingExisting.value) {
    if (isDropInsideGrid && showYellowPlaceholder.value && yellowPlaceholderPosition.value) {
      const newX = yellowPlaceholderPosition.value.x
      const newY = yellowPlaceholderPosition.value.y
      const mode = placeholderInsertionMode.value
      draggedItem.value.x = newX
      draggedItem.value.y = newY
      if (mode !== 'sameRow') {
        recalculatePositions()
      } else {
        compactToTop()
      }
    } else {
      restoreSnapshot()
    }
    emit('update:items', localItems.value)
  }
  if (previewContainerRef.value) previewContainerRef.value.innerHTML = ''
  draggedItem.value = null
  isDraggingExisting.value = false
  isMouseDown.value = false
  showYellowPlaceholder.value = false
  placeholderInsertionMode.value = 'sameRow'
  dragStartSnapshot.value = null
  draggedElementCursorPosition.value = { x: 0, y: 0 }
  document.removeEventListener('mousemove', handleExistingItemDrag)
  document.removeEventListener('mouseup', stopDrag, true)
}

const startResize = (item, direction, event) => {
  event.preventDefault()
  event.stopPropagation()
  
  resizingItem.value = item
  resizeDirection.value = direction
  resizeStartPos.value = { x: event.clientX, y: event.clientY }
  resizeStartItemPos.value = { x: item.x || 0, y: item.y || 0 }
  resizeStartSize.value = { 
    width: item.width || ELEMENT_SIZES[item.type]?.width || 200,
    height: item.height || ELEMENT_SIZES[item.type]?.height || 150
  }
  resizeStartRightEdge.value = resizeStartItemPos.value.x + resizeStartSize.value.width
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const groupItemsByRows = () => {
  const rows = new Map()
  for (const item of localItems.value) {
    const itemY = item.y || 0
    const size = getActualItemSize(item)
    let foundKey = null
    for (const [rowY] of rows) {
      if (Math.abs(rowY - itemY) < 10) {
        foundKey = rowY
        break
      }
    }
    if (foundKey === null) {
      rows.set(itemY, { items: [item], height: size.height })
    } else {
      const row = rows.get(foundKey)
      row.items.push(item)
      row.height = Math.max(row.height, size.height)
    }
  }
  return rows
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
    const desiredRight = newX + newWidth
    const maxRight = getMaxRightEdgeForResize(
      newY,
      resizeStartRightEdge.value,
      gridWidth,
      resizingItem.value.id
    )
    const clampedRight = Math.min(desiredRight, maxRight)
    newWidth = clampedRight - newX
    if (newWidth >= 100) {
      resizingItem.value.width = newWidth
      resizingItem.value.x = newX
      pushNeighborsRight(resizingItem.value, newX + newWidth, resizeStartRightEdge.value)
    }
    return
  }
  
  if (resizeDirection.value === 'w') {
    const minWidth = 100
    const rightEdge = resizeStartRightEdge.value
    let desiredLeft = resizeStartItemPos.value.x + deltaX

    // Не даём левой границе пересечь правую (учёт minWidth),
    // иначе при сильном перетягивании вправо элемент «улетает».
    const maxLeft = rightEdge - minWidth
    if (desiredLeft > maxLeft) desiredLeft = maxLeft
    if (desiredLeft < GRID_PADDING) desiredLeft = GRID_PADDING

    newX = desiredLeft
    newWidth = Math.max(minWidth, rightEdge - newX)
    if (!checkCollision(newX, newY, newWidth, newHeight, resizingItem.value.id)) {
      resizingItem.value.width = newWidth
      resizingItem.value.x = newX
    }
    return
  }
  
  if (resizeDirection.value === 's') {
    const targetHeight = Math.max(50, resizeStartSize.value.height + deltaY)
    const rows = groupItemsByRows()
    const sortedRowYs = [...rows.keys()].sort((a, b) => a - b)
    
    const itemRowIndex = sortedRowYs.findIndex(
      (rowY) => Math.abs(rowY - (resizingItem.value.y || 0)) < 10
    )
    if (itemRowIndex === -1) return
    
    const rowY = sortedRowYs[itemRowIndex]
    const row = rows.get(rowY)
    const currentRowHeight = row.height
    const deltaRowHeight = targetHeight - currentRowHeight
    
    if (deltaRowHeight > 0) {
      for (const item of localItems.value) {
        if ((item.y || 0) > rowY) {
          item.y = (item.y || 0) + deltaRowHeight
        }
      }
    }
    
    resizingItem.value.height = targetHeight
    return
  }
}

const stopResize = () => {
  if (resizingItem.value) {
    recalculatePositions()
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
    placeholderIsNewRowAtTop.value = position.isNewRowAtTop ?? false
    placeholderInsertionMode.value = position.insertionMode ?? 'sameRow'
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
  placeholderIsNewRowAtTop.value = position.isNewRowAtTop ?? false
  placeholderInsertionMode.value = position.insertionMode ?? 'sameRow'
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
    const effectiveSize = getEffectiveElementSize(itemType)
    if (!effectiveSize || !yellowPlaceholderPosition.value) return

    const mode = placeholderInsertionMode.value
    const position = mode === 'sameRow'
      ? { x: yellowPlaceholderPosition.value.x, y: yellowPlaceholderPosition.value.y }
      : calculateFinalPlacement(itemType)
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

      if (itemType === 'Заголовок') {
        newItem.title = ''
        newItem.size = 'M'
      }
      
      if (itemType === 'Текст') {
        newItem.content = ''
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
      if (mode !== 'sameRow') {
        recalculatePositions()
      } else {
        compactToTop()
      }
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
  placeholderIsNewRowAtTop.value = false
  placeholderInsertionMode.value = 'sameRow'
}

const getItemElement = (itemId) => {
  const el = itemRefs.value[itemId]
  if (el) {
    return el.$el ?? el
  }
  return document.querySelector(`[data-item-id="${itemId}"]`)
}

const getActualItemSize = (item) => {
  const defaultHeight = ELEMENT_SIZES[item.type]?.height || 150
  let actualHeight = item.height || defaultHeight

  if (item.autoHeight && autoHeightItems.value.has(item.id)) {
    actualHeight = autoHeightItems.value.get(item.id)
  } else if (renderedHeights.value.has(item.id)) {
    actualHeight = renderedHeights.value.get(item.id)
  }
  const numHeight = typeof actualHeight === 'number' && !Number.isNaN(actualHeight)
    ? actualHeight
    : defaultHeight
  return {
    width: item.width || ELEMENT_SIZES[item.type]?.width || 200,
    height: numHeight
  }
}

const resolvedHeightsMap = computed(() => {
  const map = {}
  localItems.value.forEach((item) => {
    map[item.id] = getActualItemSize(item).height
  })
  return map
})

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

const compactToTop = () => {
  if (localItems.value.length === 0) return false
  const minY = Math.min(...localItems.value.map((i) => i.y ?? 0))
  if (minY <= 0) return false
  localItems.value.forEach((item) => {
    item.y = (item.y ?? 0) - minY
  })
  return true
}

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
    const newHeight = entry.contentRect.height

    if (item && item.autoHeight) {
      const storedHeight = autoHeightItems.value.get(itemId)
      if (storedHeight !== newHeight) {
        autoHeightItems.value.set(itemId, newHeight)
        autoHeightItems.value = new Map(autoHeightItems.value)
        hasChanges = true
      }
    }

    const prevRendered = renderedHeights.value.get(itemId)
    if (prevRendered !== newHeight) {
      renderedHeights.value.set(itemId, newHeight)
      renderedHeights.value = new Map(renderedHeights.value)
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
      autoHeightItems.value = new Map(autoHeightItems.value)
    })
  }
}

const removeResizeObserver = (item) => {
  if (resizeObserver.value) {
    const element = getItemElement(item.id)
    if (element) {
      resizeObserver.value.unobserve(element)
    }
    autoHeightItems.value.delete(item.id)
    autoHeightItems.value = new Map(autoHeightItems.value)
  }
}

const observeRenderedHeight = (element, itemId) => {
  if (!resizeObserver.value || !element || observedRenderedIds.value.has(itemId)) return
  resizeObserver.value.observe(element)
  observedRenderedIds.value.add(itemId)
  observedRenderedIds.value = new Set(observedRenderedIds.value)
  const h = element.getBoundingClientRect().height
  renderedHeights.value.set(itemId, h)
  renderedHeights.value = new Map(renderedHeights.value)
}

const unobserveRenderedHeight = (itemId) => {
  if (!resizeObserver.value) return
  const element = getItemElement(itemId)
  if (element) resizeObserver.value.unobserve(element)
  observedRenderedIds.value.delete(itemId)
  observedRenderedIds.value = new Set(observedRenderedIds.value)
  renderedHeights.value.delete(itemId)
  renderedHeights.value = new Map(renderedHeights.value)
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
        const size = getEffectiveElementSize(currentDraggedType.value)
        if (size) {
          yellowPlaceholderPosition.value = {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height
          }
          placeholderIsNewRowAtTop.value = position.isNewRowAtTop ?? false
          placeholderInsertionMode.value = position.insertionMode ?? 'sameRow'
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
    placeholderIsNewRowAtTop.value = false
    placeholderInsertionMode.value = 'sameRow'
  }
}

watch(() => props.items, (newItems) => {
  if (JSON.stringify(localItems.value) !== JSON.stringify(newItems)) {
    localItems.value = [...newItems]
    if (compactToTop()) {
      emit('update:items', localItems.value)
    }
  }
}, { deep: true, immediate: true })

watch(localItems, (newItems, oldItems) => {
  updateGridContentHeight()
  if (!resizeObserver.value) return

  nextTick(() => {
    oldItems.forEach(oldItem => {
      const stillExists = newItems.find(newItem => newItem.id === oldItem.id)
      if (!stillExists) {
        removeResizeObserver(oldItem)
        unobserveRenderedHeight(oldItem.id)
      }
    })

    newItems.forEach(newItem => {
      const element = getItemElement(newItem.id)
      if (newItem.height === 'auto') {
        if (element && !autoHeightItems.value.has(newItem.id)) {
          setupResizeObserver(element, newItem)
        }
      } else {
        removeResizeObserver(newItem)
      }
      if (newItem.height !== 'auto' && element) {
        observeRenderedHeight(element, newItem.id)
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

const getResolvedHeight = (itemId) => {
  const item = localItems.value.find((i) => i.id === itemId)
  if (!item) return null
  return getActualItemSize(item).height
}

defineExpose({
  triggerRecalculatePositions,
  getResolvedHeight
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

   updateGridContentHeight()
  
  nextTick(() => {
    localItems.value.forEach(item => {
      const element = getItemElement(item.id)
      if (!element) return
      if (item.height === 'auto') {
        setupResizeObserver(element, item)
      } else {
        observeRenderedHeight(element, item.id)
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
  renderedHeights.value.clear()
  observedRenderedIds.value.clear()
})
</script>

<style scoped lang="scss">
.dashboard-grid {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 200px);
  overflow: visible;
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
  display: none;
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
  display: none;
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
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  background: var(--color-primary-background);
  transition: box-shadow 0.2s, opacity 0.2s;
  overflow: hidden;
  z-index: 2000;
}

.dragged-element-preview :deep(.grid-item) {
  width: 100%;
  height: 100%;
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