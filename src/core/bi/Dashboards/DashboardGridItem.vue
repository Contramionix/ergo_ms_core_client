<template>
  <div
    class="grid-item"
    :class="itemClasses"
    :style="itemStyle"
    :data-item-id="item.id"
    @click="onClick"
    @dblclick="onDblclick"
    @mousedown="onMouseDown"
  >
    <div v-if="!viewMode" class="item-header">
      <span class="item-type">{{ item.type }}</span>
      <div class="item-actions">
        <button class="btn-edit" @click.stop="onEdit"><Settings2 :size="16" /></button>
        <button class="btn-delete" @click.stop="onDelete"><X :size="16" /></button>
      </div>
    </div>

    <div class="item-content">
      <div
        v-if="item.type === 'Заголовок'"
        class="header-widget-title"
        :style="[{ color: item.textColor && item.textColor !== 'transparent' ? item.textColor : 'var(--color-text-primary)' }, headerStyle]"
      >
        <span>{{ item.title || 'Заголовок' }}</span>
        <div
          v-if="item.hint"
          class="hint-icon-wrapper"
          @mouseenter="onShowHint"
          @mouseleave="onHideHint"
        >
          <CircleHelp :size="16" />
        </div>
      </div>

      <div
        v-else-if="item.type === 'Текст'"
        class="text-widget-content"
        :style="{ color: item.textColor && item.textColor !== 'transparent' ? item.textColor : 'var(--color-text-primary)' }"
        v-html="item.content || 'Текстовое содержимое'"
      />

      <div v-else-if="item.type === 'Чарт'" class="chart-widget-container">
        <ChartWidget
          :charts-list="item.chartsList || []"
          :active-chart-index="item.activeChartIndex || 0"
          :auto-height="item.autoHeight || false"
          @update:active-chart-index="onUpdateActiveChart"
          @content-resized="onChartResize"
        />
      </div>

      <div v-else-if="item.type === 'Селектор'" class="selector-widget-container">
        <SelectorWidget
          :selectors-list="item.selectorsList || []"
          :active-selector-index="item.activeSelectorIndex || 0"
          :auto-height="item.autoHeight || item.selectorGroupSettings?.autoHeight || false"
          :selector-group-settings="item.selectorGroupSettings || {}"
          @selection-change="onSelectorSelectionChange"
          @content-resized="onSelectorResize"
          @apply-filters="onSelectorApplyFilters"
          @clear-filters="onSelectorClearFilters"
        />
      </div>

      <div v-else class="item-preview">
        {{ itemPreview }}
      </div>
    </div>

    <div v-if="!viewMode && item.selected" class="resize-indicators">
      <div
        class="resize-indicator resize-left"
        @mousedown.stop="onStartResize('w', $event)"
      ></div>
      <div
        class="resize-indicator resize-right"
        @mousedown.stop="onStartResize('e', $event)"
      ></div>
      <div
        class="resize-indicator resize-bottom"
        @mousedown.stop="onStartResize('s', $event)"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Settings2, X, CircleHelp } from 'lucide-vue-next'
import ChartWidget from './Chart/ChartWidget.vue'
import SelectorWidget from './Selector/SelectorWidget.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  viewMode: {
    type: Boolean,
    default: false
  },
  elementSizes: {
    type: Object,
    required: true
  },
  shiftStyle: {
    type: Object,
    default: () => ({})
  },
  isDraggingExisting: {
    type: Boolean,
    default: false
  },
  draggedItemId: {
    type: [Number, String, null],
    default: null
  },
  showHint: {
    type: Function,
    default: null
  },
  hideHint: {
    type: Function,
    default: null
  },
  itemPreview: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'select',
  'dblclick',
  'mousedown',
  'edit',
  'delete',
  'start-resize',
  'update-active-chart',
  'chart-resize',
  'selector-selection-change',
  'selector-resize',
  'selector-apply-filters',
  'selector-clear-filters'
])

const itemClasses = computed(() => {
  const typeClassKey = `item-${(props.item.type || '').toLowerCase()}`
  return {
    [typeClassKey]: true,
    'item-selected': props.item.selected,
    'view-mode': props.viewMode,
    'item-dragging': props.draggedItemId === props.item.id,
    'item-hidden-drag':
      props.isDraggingExisting && props.draggedItemId === props.item.id,
    'item-auto-height':
      props.item.autoHeight || props.item.selectorGroupSettings?.autoHeight
  }
})

const itemStyle = computed(() => {
  const width =
    props.item.width ||
    props.elementSizes[props.item.type]?.width ||
    200
  const height =
    props.item.autoHeight || props.item.selectorGroupSettings?.autoHeight
      ? 'auto'
      : `${
          props.item.height ||
          props.elementSizes[props.item.type]?.height ||
          150
        }px`

  const baseStyle = {
    position: 'absolute',
    left: `${props.item.x || 0}px`,
    top: `${props.item.y || 0}px`,
    width: `${width}px`,
    height
  }

  if (props.item.background) {
    baseStyle.background = props.item.background
  }

  if (props.draggedItemId === props.item.id) {
    baseStyle.zIndex = 1000
    baseStyle.opacity = 0.8
  }

  if (props.shiftStyle && Object.keys(props.shiftStyle).length) {
    Object.assign(baseStyle, props.shiftStyle)
  }

  return baseStyle
})

const headerStyle = computed(() => {
  if (props.item.type !== 'Заголовок' || !props.item.size) {
    return {}
  }

  const style = {}
  switch (props.item.size) {
    case 'XS':
      style.fontSize = '16px'
      break
    case 'S':
      style.fontSize = '20px'
      break
    case 'M':
      style.fontSize = '24px'
      break
    case 'L':
      style.fontSize = '28px'
      break
    case 'XL':
      style.fontSize = '32px'
      break
    default:
      break
  }
  return style
})

const itemPreview = computed(() => props.itemPreview)
  'selector-clear-filters'

const onClick = () => {
  emit('select', props.item)
}

const onDblclick = () => {
  emit('dblclick', props.item)
}

const onMouseDown = (event) => {
  emit('mousedown', props.item, event)
}

const onEdit = () => {
  emit('edit', props.item)
}

const onDelete = () => {
  emit('delete', props.item)
}

const onStartResize = (direction, event) => {
  emit('start-resize', props.item, direction, event)
}

const onUpdateActiveChart = (newIndex) => {
  emit('update-active-chart', props.item, newIndex)
}

const onChartResize = (newHeight) => {
  emit('chart-resize', props.item, newHeight)
}

const onSelectorSelectionChange = (selectionData) => {
  emit('selector-selection-change', props.item, selectionData)
}

const onSelectorResize = (newHeight) => {
  emit('selector-resize', props.item, newHeight)
}

const onSelectorApplyFilters = (event) => {
  emit('selector-apply-filters', props.item, event)
}

const onSelectorClearFilters = (event) => {
  emit('selector-clear-filters', props.item, event)
}

const onShowHint = (event) => {
  if (typeof props.showHint === 'function') {
    props.showHint(props.item, event)
  }
}

const onHideHint = () => {
  if (typeof props.hideHint === 'function') {
    props.hideHint()
  }
}
</script>

<style scoped lang="scss">
.grid-item {
  z-index: 2;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  cursor: move;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  box-sizing: border-box;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .item-actions,
    .item-header {
      opacity: 1;
    }
  }

  &.item-selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }

  &.item-dragging {
    transform: scale(1.02);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
}

.grid-item.view-mode {
  cursor: default;
  border-color: transparent;
  box-shadow: none;
}

.grid-item.view-mode:hover {
  border-color: transparent;
  box-shadow: none;
}

.grid-item.view-mode.item-selected {
  border-color: transparent;
  box-shadow: none;
}

.grid-item.item-hidden-drag {
  opacity: 0 !important;
  pointer-events: none !important;
}

.item-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  min-height: 20px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.2s ease;
  padding: 8px 12px;
  background: rgba(var(--color-primary-rgb), 0.06);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.18);
  z-index: 10;
  border-radius: 8px 8px 0 0;
}

.item-type {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.item-actions {
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 1;
}

.btn-edit,
.btn-delete {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-hover-background);
    color: var(--color-text-primary);
  }
}

.btn-delete:hover {
  color: var(--color-danger);
}

.item-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.header-widget-title {
  display: flex;
  align-items: center;
  font-weight: 500;
  text-align: left;
  width: 100%;
  word-break: break-word;
  white-space: normal;
  padding: 6px 10px;
}

.text-widget-content {
  font-size: 14px;
  line-height: 1.5;
  width: 100%;
  height: 100%;
  overflow: auto;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;

  :deep(h1, h2, h3, h4, h5, h6) {
    margin: 0.5em 0;
    font-weight: 600;
  }

  :deep(p) {
    margin: 0.5em 0;
  }

  :deep(ul, ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  /* Убираем лишний отступ сверху и снизу первого / последнего блока текста,
     чтобы расстояние сверху и снизу было более симметричным */
  :deep(p:first-child),
  :deep(h1:first-child),
  :deep(h2:first-child),
  :deep(h3:first-child),
  :deep(h4:first-child),
  :deep(h5:first-child),
  :deep(h6:first-child),
  :deep(ul:first-child),
  :deep(ol:first-child),
  :deep(blockquote:first-child) {
    margin-top: 0;
  }

  :deep(p:last-child),
  :deep(h1:last-child),
  :deep(h2:last-child),
  :deep(h3:last-child),
  :deep(h4:last-child),
  :deep(h5:last-child),
  :deep(h6:last-child),
  :deep(ul:last-child),
  :deep(ol:last-child),
  :deep(blockquote:last-child) {
    margin-bottom: 0;
  }

  :deep(blockquote) {
    margin: 1em 0;
    padding: 0.5em 1em;
    border-left: 4px solid var(--color-border);
    background: var(--color-background);
  }

  :deep(pre) {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 1em;
    overflow-x: auto;
    font-family: monospace;
  }

  :deep(code) {
    background: var(--color-background);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
  }
}

.chart-widget-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.selector-widget-container {
  width: 100%;
  height: 100%;
}

.item-preview {
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

  @media (max-width: 400px) {
    font-size: 12px;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
}

.resize-indicators {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.resize-indicator {
  position: absolute;
  background: var(--color-primary);
  pointer-events: auto;
  opacity: 0.6;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  &.resize-left {
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 30px;
    cursor: w-resize;
    border-radius: 4px 0 0 4px;
  }

  &.resize-right {
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 30px;
    cursor: e-resize;
    border-radius: 0 4px 4px 0;
  }

  &.resize-bottom {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 8px;
    cursor: s-resize;
    border-radius: 0 0 4px 4px;
  }
}

.item-auto-height {
  height: auto !important;
  min-height: 50px;

  .text-widget-content {
    height: auto !important;
    overflow: visible;
    display: block;
  }

  .chart-widget-container {
    height: auto !important;
    overflow: visible;
  }

  .item-content {
    height: auto !important;
    min-height: auto;
  }

  .selector-widget-container {
    height: auto !important;
    overflow: visible;
  }
}

.hint-icon-wrapper {
  margin-left: 5px;
  cursor: pointer;
}

.item-чарт {
  padding: 0;
  background: linear-gradient(
    135deg,
    var(--color-primary-background) 0%,
    rgba(var(--color-primary-rgb), 0.05) 100%
  );
}

.item-селектор {
  background: linear-gradient(
    135deg,
    var(--color-primary-background) 0%,
    rgba(54, 162, 235, 0.05) 100%
  );

  .item-preview {
    font-size: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
  }
}

.item-текст {
  background: linear-gradient(
    135deg,
    var(--color-primary-background) 0%,
    rgba(75, 192, 192, 0.05) 100%
  );
}

.item-заголовок {
  background: linear-gradient(
    135deg,
    var(--color-primary-background) 0%,
    rgba(255, 206, 86, 0.05) 100%
  );

  .item-content {
    padding: 0;
  }

  .item-preview {
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
  }
}
</style>

