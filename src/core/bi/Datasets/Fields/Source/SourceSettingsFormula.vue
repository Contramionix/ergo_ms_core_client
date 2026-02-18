<template>
  <div class="split-pane vertical">
    <div class="Pane Panel vertical" :style="panelStyle">
      <div class="settings-sidebar">
        <input v-model="search" class="form-control form-control-sm sidebar-search-input mb-2" placeholder="Поле или параметр" />
        <ul class="fields-list">
          <li v-for="item in filteredItemsWithMeta" :key="item.itemKey" class="field-item" @click="onInsertItem(item.name)">
            <span class="col-icon" :style="{ color: item.meta.color }">
              <component :is="item.meta.icon" :size="15" />
            </span>
            <span class="col-name">{{ item.name }}</span>
          </li>
        </ul>
      </div>
    </div>

    <span role="presentation" class="Resizer vertical" @mousedown.prevent="startResize"></span>

    <div class="Pane Pane2 vertical" :style="pane2Style">
      <div class="settings-editor">
        <CodeMirror ref="codeMirrorRef" :model-value="localExpression" :lang="formulaLanguage" :extensions="editorExtensions" placeholder="Введите формулу, например: SUM([Поле]) / COUNT([Другое поле])" class="formula-codemirror" @update:model-value="onEditorChange" @ready="onEditorReady"/>
        <div v-if="validationResult.errors.length > 0" class="formula-validation-errors">
          <div class="formula-validation-title">Ошибки в формуле</div>
          <ul class="formula-validation-list">
            <li v-for="(err, idx) in validationResult.errors" :key="idx">{{ err.message }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import CodeMirror from 'vue-codemirror6'
import { getTypeDisplayMeta, getItemDisplayColor } from '../js/fieldTypeDisplay.js'
import { formulaLanguage } from './js/formulaLanguage.js'
import { validateFormula } from './js/formulaValidation.js'
import { lineNumbers } from '@codemirror/view'
import { indentUnit } from '@codemirror/language'

const search = ref('')

const props = defineProps({
  expression: { type: String, default: '' },
  fields: { type: Array, default: () => [] },
  params: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:expression', 'update:formulaValid'])

const localExpression = ref(props.expression || '')
const codeMirrorRef = ref(null)

const editorExtensions = [lineNumbers(), indentUnit.of('  ')]

const itemsList = computed(() => {
  const fields = (props.fields || []).map(f => ({
    itemKey: `field:${f.name ?? ''}`,
    name: f.name,
    type: f.type || 'string',
    param: false,
    aggregation: f.aggregation
  }))
  const params = (props.params || []).map(p => {
    const name = typeof p === 'string' ? p : (p.name ?? p)
    return {
      itemKey: `param:${name}`,
      name,
      type: (typeof p === 'object' && p.type) ? p.type : 'string',
      param: true
    }
  })
  return [...fields, ...params]
})

const filteredItems = computed(() =>
  itemsList.value.filter(item =>
    item.name.toLowerCase().includes(search.value.toLowerCase())
  )
)

const filteredItemsWithMeta = computed(() =>
  filteredItems.value.map(item => ({
    ...item,
    meta: { ...getTypeDisplayMeta(item.type), color: getItemDisplayColor(item) }
  }))
)

const validationResult = computed(() => {
  const expr = localExpression.value ?? ''
  if (typeof expr !== 'string' || expr.trim() === '') {
    return { valid: true, errors: [] }
  }
  return validateFormula(expr, props.fields || [], props.params || [])
})

watch(validationResult, (v) => {
  emit('update:formulaValid', v.valid)
}, { immediate: true })

function onEditorChange(value) {
  localExpression.value = value ?? ''
  emit('update:expression', localExpression.value)
}

function onEditorReady({ view }) {
  if (view && props.expression != null) {
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
  },
  validationResult,
  get isFormulaValid() {
    return validationResult.value.valid
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

  &:hover,
  &:active {
    background: var(--color-hover-background);
  }
}

.field-item .col-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.field-item .col-name {
  margin-left: 10px;
}

.field-item .lucide {
  filter: drop-shadow(0 0 3px rgba(60, 200, 255, 0.27));
}

.formula-validation-errors {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-error-background, rgba(229, 57, 53, 0.08));
  border: 1px solid var(--color-accent, #e53935);
  border-radius: 6px;
  font-size: 0.85rem;
}

.formula-validation-title {
  font-weight: 600;
  color: var(--color-accent, #e53935);
  margin-bottom: 0.25rem;
}

.formula-validation-list {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--color-primary-text);
}
</style>