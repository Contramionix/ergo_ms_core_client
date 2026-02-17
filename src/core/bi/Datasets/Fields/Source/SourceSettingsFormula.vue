<template>
  <div class="split-pane vertical">
    <div class="Pane Panel vertical" :style="panelStyle">
      <div class="settings-sidebar">
        <input v-model="search" class="form-control form-control-sm sidebar-search-input mb-2" placeholder="Поле или параметр" />
        <ul class="fields-list">
          <li v-for="item in filteredItems" :key="item.name" class="field-item" @click="onInsertItem(item.name)">
            <span class="col-icon" style="display: flex; align-items: center; justify-content: center;" :style="{ color: getTypeMeta(item.type).color }">
              <component :is="getTypeMeta(item.type).icon" :size="15" />
            </span>
            <span class="col-name" style="margin-left: 10px;">{{ item.name }}</span>
            <span class="col-type-label" :style="{ color: getTypeMeta(item.type).color }">
              {{ item.param ? 'Параметр' : getTypeMeta(item.type).label }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <span role="presentation" class="Resizer vertical" @mousedown.prevent="startResize"></span>

    <div class="Pane Pane2 vertical" :style="pane2Style">
      <div class="settings-editor" ref="editorContainerRef">
        <CodeMirror
          ref="codeMirrorRef"
          :model-value="localExpression"
          :lang="formulaLanguage"
          :extensions="editorExtensions"
          placeholder="Введите формулу, например: SUM([Поле]) / COUNT([Другое поле])"
          class="formula-codemirror"
          @update:model-value="onEditorChange"
          @ready="onEditorReady"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Type, Hash, Calendar, CheckCircle, MapPin, Globe, SquareFunction } from 'lucide-vue-next'
import CodeMirror from 'vue-codemirror6'
import { formulaLanguage } from './js/formulaLanguage.js'
import { indentUnit } from '@codemirror/language'

const search = ref('')

const props = defineProps({
  expression: { type: String, default: '' },
  fields: { type: Array, default: () => [] },
  params: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:expression'])

const localExpression = ref(props.expression || '')
const codeMirrorRef = ref(null)
const editorContainerRef = ref(null)

const editorExtensions = [indentUnit.of('  ')]

const itemsList = computed(() => {
  const fields = (props.fields || []).map(f => ({
    name: f.name,
    type: f.type || 'string',
    param: false
  }))
  const params = (props.params || []).map(p => ({
    name: typeof p === 'string' ? p : (p.name || p),
    type: (typeof p === 'object' && p.type) ? p.type : 'string',
    param: true
  }))
  const seen = new Set()
  const out = []
  for (const x of [...fields, ...params]) {
    if (seen.has(x.name)) continue
    seen.add(x.name)
    out.push(x)
  }
  return out
})

const filteredItems = computed(() =>
  itemsList.value.filter(item =>
    item.name.toLowerCase().includes(search.value.toLowerCase())
  )
)

const typeIconMap = {
  string: { icon: Type, color: '#0d6efd', label: '' },
  integer: { icon: Hash, color: '#198754', label: '' },
  float: { icon: Hash, color: '#198754', label: '' },
  number: { icon: Hash, color: '#198754', label: '' },
  date: { icon: Calendar, color: '#fd7e14', label: '' },
  'date&time': { icon: Calendar, color: '#fd7e14', label: '' },
  datetime: { icon: Calendar, color: '#fd7e14', label: '' },
  bool: { icon: CheckCircle, color: '#20c997', label: '' },
  boolean: { icon: CheckCircle, color: '#20c997', label: '' },
  geopoint: { icon: MapPin, color: '#dc3545', label: '' },
  geopolygon: { icon: Globe, color: '#6f42c1', label: '' },
  expression: { icon: SquareFunction, color: '#6f42c1', label: 'fx' },
  default: { icon: Type, color: 'var(--color-accent)', label: '' }
}

function getTypeMeta(type) {
  return typeIconMap[type] || typeIconMap.default
}

function onEditorChange(value) {
  localExpression.value = value ?? ''
  emit('update:expression', localExpression.value)
}

function onEditorReady({ view }) {
  if (view && props.expression !== undefined && props.expression !== null) {
    const str = String(props.expression)
    if (view.state.doc.toString() !== str) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: str }
      })
    }
  }
}

watch(() => props.expression, (val) => {
  const s = val ?? ''
  if (localExpression.value !== s) localExpression.value = s
}, { immediate: true })

function insertAtCursor(text) {
  const editor = codeMirrorRef.value
  if (editor?.replaceSelection) editor.replaceSelection(text)
}

function onInsertItem(name) {
  insertAtCursor(`[${name}]`)
}

const panelWidth = ref(256)
const minWidth = 150
const maxWidth = 600
let isResizing = false, startX = 0, startWidth = 0

function startResize(e) {
  isResizing = true
  startX = e.clientX
  startWidth = panelWidth.value
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopResize)
}
function onMouseMove(e) {
  if (!isResizing) return
  const delta = e.clientX - startX
  panelWidth.value = Math.min(maxWidth, Math.max(minWidth, startWidth + delta))
}
function stopResize() {
  isResizing = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopResize)
}
onBeforeUnmount(stopResize)

const panelStyle = computed(() => ({
  flex: '0 0 auto',
  width: `${panelWidth.value}px`,
  position: 'relative',
  outline: 'none'
}))

const pane2Style = computed(() => ({
  flex: '1 1 auto',
  position: 'relative',
  outline: 'none',
  minWidth: `calc(100% - ${maxWidth}px)`,
  maxWidth: `calc(100% - ${minWidth}px)`
}))

defineExpose({
  insertAtCursor(text) {
    insertAtCursor(typeof text === 'string' ? text : `[${text}]`)
  }
})
</script>

<style scoped lang="scss">
.split-pane.vertical {
  display: flex;
  height: 100%;
  overflow: hidden;
  user-select: text;
}

.Pane {
  display: flex;
  flex-direction: column;
}

.Resizer.vertical {
  position: relative;
  width: 9px;
  margin: 0 -4px;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
}

.Resizer.vertical::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 100%;
  background: var(--color-border);
}

.Resizer.vertical:hover::before {
  background: var(--color-primary-text);
}

.settings-sidebar {
  padding: 0.5rem 1rem 0.5rem 0;
}

.settings-sidebar input.form-control.sidebar-search-input {
  background: var(--color-primary-background) !important;
  color: var(--color-primary-text) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 4px !important;
  transition: border-color 0.2s ease !important;
}

.settings-sidebar input.form-control.sidebar-search-input:focus {
  border-color: var(--color-border) !important;
  outline: none !important;
  box-shadow: none !important;
}

.settings-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0.5rem;
  border-left: none;
}

.settings-editor :deep(.vue-codemirror) {
  height: 100%;
  min-height: 120px;
}

.settings-editor :deep(.cm-editor) {
  height: 100%;
  min-height: 120px;
  font-size: 14px;
}

.settings-editor :deep(.cm-scroller) {
  font-family: ui-monospace, monospace;
}

.settings-editor :deep(.cm-content) {
  padding: 8px;
}

.fields-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: min(50vh, 320px);
  overflow-y: auto;
}

.field-item {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.13s, box-shadow 0.13s;
  font-size: 15px;
  margin-bottom: 2px;

  &:hover {
    background: var(--color-hover-background);
  }

  &:active {
    background: var(--color-hover-background);
  }
}

.field-item .lucide {
  filter: drop-shadow(0 0 3px rgba(60, 200, 255, 0.27));
}
</style>
