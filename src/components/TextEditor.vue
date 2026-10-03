<template>
  <div class="text-editor">
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <HoverTooltip :text="t('components.textEditor.undo')">
          <button type="button" class="toolbar-btn" :aria-label="t('components.textEditor.undo')">
            <Undo2 :size="14" />
          </button>
        </HoverTooltip>
        <HoverTooltip :text="t('components.textEditor.redo')">
          <button type="button" class="toolbar-btn" :aria-label="t('components.textEditor.redo')">
            <Redo2 :size="14" />
          </button>
        </HoverTooltip>
      </div>
      <div class="toolbar-separator"></div>
      <div class="toolbar-formatting">
        <HoverTooltip :text="t('components.textEditor.bold')">
          <button type="button" class="toolbar-btn" :class="{ 'active': activeFormats.bold }" :aria-label="t('components.textEditor.bold')" @click="applyFormat('bold')">B</button>
        </HoverTooltip>
        <HoverTooltip :text="t('components.textEditor.italic')">
          <button type="button" class="toolbar-btn" :class="{ 'active': activeFormats.italic }" :aria-label="t('components.textEditor.italic')" @click="applyFormat('italic')">I</button>
        </HoverTooltip>
        <HoverTooltip :text="t('components.textEditor.underline')">
          <button type="button" class="toolbar-btn" :class="{ 'active': activeFormats.underline }" :aria-label="t('components.textEditor.underline')" @click="applyFormat('underline')">U</button>
        </HoverTooltip>
        <HoverTooltip :text="t('components.textEditor.strike')">
          <button type="button" class="toolbar-btn" :class="{ 'active': activeFormats.strikeThrough }" :aria-label="t('components.textEditor.strike')" @click="applyFormat('strikeThrough')">S</button>
        </HoverTooltip>
        <HoverTooltip :text="t('components.textEditor.monospace')">
          <button type="button" class="toolbar-btn" :class="{ 'active': activeFormats.monospace }" :aria-label="t('components.textEditor.monospace')" @click="toggleMonospace">M</button>
        </HoverTooltip>
        <HoverTooltip :text="t('components.textEditor.highlight')">
          <button type="button" class="toolbar-btn" :class="{ 'active': activeFormats.highlight }" :aria-label="t('components.textEditor.highlight')" @click="toggleHighlight"><WholeWord /></button>
        </HoverTooltip>
      </div>
      <div class="toolbar-separator"></div>
      <div class="toolbar-styles">
        <HoverTooltip :text="styleMenuOpen ? '' : t('components.textEditor.style')">
        <DropDown ref="styleMenuRef" make-center :menu-min-width="180" @dropdown-toggle="(open) => onMenuToggle('style', open)">
          <template #main>
            <button class="toolbar-btn toolbar-btn-list" :class="{ 'active': selectedStyle !== 'p', 'tooltip-open': styleMenuOpen }" type="button" :aria-label="t('components.textEditor.style')">
              H
              <ChevronDown :size="14" />
            </button>
          </template>
          <template #list>
            <li>
              <a class="dropdown-item" :class="{ 'active': selectedStyle === 'p' }" href="#" @click.prevent="setStyle('p')">
                <span class="menu-icon"><Type :size="20" /></span>
                <span>{{ t('components.textEditor.text') }}</span>
              </a>
            </li>
            <li v-for="n in 6" :key="n">
              <a class="dropdown-item" :class="{ 'active': selectedStyle === 'h' + n }" href="#" @click.prevent="setStyle('h' + n)">
                <span class="menu-icon">
                  <component :is="headingIcons[n - 1]" :size="20" />
                </span>
                <span>{{ t('components.textEditor.heading', { n }) }}</span>
              </a>
            </li>
          </template>
        </DropDown>
        </HoverTooltip>
        <HoverTooltip :text="listMenuOpen ? '' : t('components.textEditor.list')">
        <DropDown ref="listMenuRef" make-center :menu-min-width="220" @dropdown-toggle="(open) => onMenuToggle('list', open)">
          <template #main>
            <button class="toolbar-btn toolbar-btn-list" :class="{ 'active': selectedListStyle, 'tooltip-open': listMenuOpen }" type="button" :aria-label="t('components.textEditor.list')">
              <List :size="14" />
              <ChevronDown :size="14" />
            </button>
          </template>
          <template #list>
            <li>
              <a class="dropdown-item" :class="{ 'active': selectedListStyle === 'ul' }" href="#" @click.prevent="setList('insertUnorderedList')">
                <span class="menu-icon"><List :size="20" /></span>
                <span>{{ t('components.textEditor.bulletList') }}</span>
              </a>
            </li>
            <li>
              <a class="dropdown-item" :class="{ 'active': selectedListStyle === 'ol' }" href="#" @click.prevent="setList('insertOrderedList')">
                <span class="menu-icon"><ListOrdered :size="20" /></span>
                <span>{{ t('components.textEditor.numberedList') }}</span>
              </a>
            </li>
          </template>
        </DropDown>
        </HoverTooltip>
      </div>
      <div class="toolbar-separator"></div>
      <div class="toolbar-actions">
        <HoverTooltip :text="moreMenuOpen ? '' : t('components.textEditor.more')">
        <DropDown ref="moreMenuRef" make-center :menu-min-width="200" @dropdown-toggle="(open) => onMenuToggle('more', open)">
          <template #main>
            <button class="toolbar-btn" :class="{ 'tooltip-open': moreMenuOpen }" type="button" :aria-label="t('components.textEditor.more')">
              <MoreHorizontal :size="14" />
            </button>
          </template>
          <template #list>
            <li v-for="action in moreActions" :key="action.command">
              <a class="dropdown-item" :class="{ 'is-disabled': action.disabled }" href="#" :aria-disabled="action.disabled ? 'true' : undefined" @click.prevent="onMoreAction(action)">
                <span class="menu-icon">
                  <component :is="action.icon" :size="20" />
                </span>
                <span>{{ action.label }}</span>
              </a>
            </li>
          </template>
        </DropDown>
        </HoverTooltip>
        <HoverTooltip :text="settingsMenuOpen ? '' : t('components.textEditor.settings')">
        <DropDown ref="settingsMenuRef" dropdown-menu-class="dropdown-menu-end" :menu-min-width="280" @dropdown-toggle="(open) => onMenuToggle('settings', open)">
          <template #main>
            <button class="toolbar-btn" :class="{ 'tooltip-open': settingsMenuOpen }" type="button" :aria-label="t('components.textEditor.settings')">
              <Settings :size="14" />
            </button>
          </template>
          <template #list>
            <li>
              <a class="dropdown-item" :class="{ 'active': editorMode === 'wysiwyg' }" href="#" @click.prevent="editorMode = 'wysiwyg'">
                <span class="menu-icon"><Type :size="20" /></span>
                <span>{{ t('components.textEditor.wysiwyg') }}</span>
              </a>
            </li>
            <li>
              <a class="dropdown-item" :class="{ 'active': editorMode === 'markdown' }" href="#" @click.prevent="editorMode = 'markdown'">
                <span class="menu-icon"><FileText :size="20" /></span>
                <span>{{ t('components.textEditor.markdown') }}</span>
              </a>
            </li>
            <li class="menu-separator" role="separator"></li>
            <li class="settings-option">
              <label>
                <input type="checkbox" v-model="toolbarEnabled" />
                <span>{{ t('components.textEditor.toolbar') }}</span>
              </label>
              <div class="settings-description">
                {{ t('components.textEditor.toolbarHint') }}
              </div>
            </li>
          </template>
        </DropDown>
        </HoverTooltip>
      </div>
    </div>
    <div class="editor-content">
      <div ref="editorDiv" class="editor-textarea" contenteditable="true" @input="updateHintText" @keyup="updateSelectionStyle" @mouseup="updateSelectionStyle" :placeholder="t('components.textEditor.placeholder')"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, reactive } from 'vue';
import {
  WholeWord, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Type, List, ListOrdered,
  Link, StickyNote, Scissors, Quote, Code, SquareCode, Image, Table, Minus, Smile, FileText,
  Undo2, Redo2, ChevronDown, MoreHorizontal, Settings
} from '@lucide/vue';
import DropDown from '@/components/DropDown.vue';
import HoverTooltip from '@/components/HoverTooltip.vue';
import { useAppI18n } from '@/i18n/useAppI18n.js';

const { t } = useAppI18n();

const props = defineProps({
  hintText: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  }
});

const headingIcons = [Heading1, Heading2, Heading3, Heading4, Heading5, Heading6];

const selectedStyle = ref('p');
const selectedListStyle = ref('');
const editorDiv = ref(null);
const toolbarEnabled = ref(true);
const editorMode = ref('wysiwyg');

const styleMenuRef = ref(null);
const listMenuRef = ref(null);
const moreMenuRef = ref(null);
const settingsMenuRef = ref(null);
const styleMenuOpen = ref(false);
const listMenuOpen = ref(false);
const moreMenuOpen = ref(false);
const settingsMenuOpen = ref(false);

const menuRefs = {
  style: styleMenuRef,
  list: listMenuRef,
  more: moreMenuRef,
  settings: settingsMenuRef,
};

const menuOpen = {
  style: styleMenuOpen,
  list: listMenuOpen,
  more: moreMenuOpen,
  settings: settingsMenuOpen,
};

function onMenuToggle(which, open) {
  menuOpen[which].value = open;
  if (!open) return;
  for (const key of Object.keys(menuRefs)) {
    if (key !== which) menuRefs[key].value?.closeDropdown();
  }
}

const activeFormats = reactive({
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  monospace: false,
  highlight: false,
});

const moreActions = computed(() => [
  { label: t('components.textEditor.link'), icon: Link, command: 'createLink' },
  { label: t('components.textEditor.note'), icon: StickyNote, command: 'addNote' },
  { label: t('components.textEditor.cut'), icon: Scissors, command: 'addCut' },
  { label: t('components.textEditor.quote'), icon: Quote, command: 'blockquote' },
  { label: t('components.textEditor.inlineCode'), icon: Code, command: 'inlineCode' },
  { label: t('components.textEditor.codeBlock'), icon: SquareCode, command: 'pre' },
  { label: t('components.textEditor.image'), icon: Image, command: 'insertImage' },
  { label: t('components.textEditor.table'), icon: Table, command: 'insertTable', disabled: true },
  { label: t('components.textEditor.rule'), icon: Minus, command: 'insertHorizontalRule' },
  { label: t('components.textEditor.emoji'), icon: Smile, command: 'insertEmoji' },
]);

function applyFormat(command) {
  editorDiv.value?.focus();
  document.execCommand(command, false, null);
  updateSelectionStyle();
}

function toggleHighlight() {
  editorDiv.value?.focus();
  const isHighlighted = activeFormats.highlight;
  document.execCommand('backColor', false, isHighlighted ? 'transparent' : 'yellow');
  updateSelectionStyle();
}

function toggleMonospace() {
  editorDiv.value?.focus();
  const isMonospace = activeFormats.monospace;
  document.execCommand('fontName', false, isMonospace ? 'sans-serif' : 'monospace');
  updateSelectionStyle();
}

function setStyle(style) {
  selectedStyle.value = style;
  editorDiv.value?.focus();
  document.execCommand('formatBlock', false, style);
  styleMenuRef.value?.closeDropdown();
}

function setList(command) {
  editorDiv.value?.focus();
  document.execCommand(command, false, null);
  listMenuRef.value?.closeDropdown();
  updateSelectionStyle();
}

function onMoreAction(action) {
  if (action.disabled) return;
  handleMoreAction(action.command);
}

function handleMoreAction(command) {
  editorDiv.value?.focus();

  switch (command) {
    case 'createLink': {
      const url = prompt(t('components.textEditor.promptUrl'));
      if (url) document.execCommand('createLink', false, url);
      break;
    }
    case 'blockquote':
      document.execCommand('formatBlock', false, 'blockquote');
      break;
    case 'pre':
      document.execCommand('formatBlock', false, 'pre');
      break;
    case 'insertImage': {
      const url = prompt(t('components.textEditor.promptImage'));
      if (url) document.execCommand('insertImage', false, url);
      break;
    }
    case 'insertHorizontalRule':
      document.execCommand('insertHorizontalRule', false, null);
      break;
    default:
      logWarn(t('components.textEditor.notImplemented', { command }));
  }

  moreMenuRef.value?.closeDropdown();
  updateSelectionStyle();
}

function updateSelectionStyle() {
  if (document.queryCommandSupported('formatBlock')) {
    let style = document.queryCommandValue('formatBlock').toLowerCase();
    if (!style || !style.length || style === 'div') {
      style = 'p';
    }
    selectedStyle.value = style;
  }
  if (document.queryCommandState('insertUnorderedList')) {
    selectedListStyle.value = 'ul';
  } else if (document.queryCommandState('insertOrderedList')) {
    selectedListStyle.value = 'ol';
  } else {
    selectedListStyle.value = '';
  }

  activeFormats.bold = document.queryCommandState('bold');
  activeFormats.italic = document.queryCommandState('italic');
  activeFormats.underline = document.queryCommandState('underline');
  activeFormats.strikeThrough = document.queryCommandState('strikeThrough');

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  let parentEl = selection.getRangeAt(0).commonAncestorContainer;
  if (parentEl.nodeType !== 1) {
    parentEl = parentEl.parentNode;
  }

  let highlight = false;
  let el = parentEl;
  while (el && el !== editorDiv.value) {
    if (el.style && (el.style.backgroundColor === 'yellow' || el.style.backgroundColor === 'rgb(255, 255, 0)')) {
      highlight = true;
      break;
    }
    if (el.tagName === 'FONT' && el.color === 'yellow') {
      highlight = true;
      break;
    }
    el = el.parentNode;
  }
  activeFormats.highlight = highlight;

  let monospace = false;
  el = parentEl;
  while(el && el !== editorDiv.value) {
    if (el.tagName === 'FONT' && el.face && el.face.toLowerCase() === 'monospace') {
         monospace = true;
         break;
    }
    if (el.style && el.style.fontFamily) {
      const ff = el.style.fontFamily.toLowerCase();
      if (ff.includes('monospace') || ff.includes('courier')) {
        monospace = true;
        break;
      }
    }
    el = el.parentNode;
  }
  activeFormats.monospace = monospace;
}

const emit = defineEmits(['update:hintText', 'update:content']);
function updateHintText(event) {
  if (props.hintText !== undefined) {
    emit('update:hintText', event.target.innerHTML);
  }
  if (props.content !== undefined) {
    emit('update:content', event.target.innerHTML);
  }
}

onMounted(() => {
  if (editorDiv.value) {
    const initialContent = props.content || props.hintText || '<p><br></p>';
    editorDiv.value.innerHTML = initialContent;
    if (!props.content && !props.hintText) {
      if (props.content !== undefined) {
        emit('update:content', initialContent);
      }
      if (props.hintText !== undefined) {
        emit('update:hintText', initialContent);
      }
    }

    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(editorDiv.value.firstChild, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
});
</script>

<style scoped lang="scss">
.text-editor {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  margin-top: 4px;
  overflow: visible;
  position: relative;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-primary-background);
  gap: 4px;
  overflow: visible;
  position: relative;
  z-index: 10;
}
.toolbar-left,
.toolbar-formatting,
.toolbar-styles,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.toolbar-separator {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 4px;
}
.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
  &:hover,
  &.tooltip-open {
    background: var(--color-hover-background);
    color: var(--color-text-primary);
  }
  &.active {
    background: var(--bs-primary-bg-subtle);
    color: var(--color-text-primary);
    &:hover {
      background: var(--bs-primary-border-subtle);
    }
  }
  svg {
    width: 14px;
    height: 14px;
  }
  z-index: 20;
}

.toolbar-btn-list{
  display: flex;
  gap: 4px;
  width: 42px;
  height: 28px;
}

.editor-content {
  min-height: 120px;
  overflow: visible;
  position: relative;
  z-index: 1;
}
.editor-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  &::placeholder {
    color: var(--color-text-secondary);
  }
  &:focus {
    outline: none;
  }
}
.dropdown-item.active {
  background: var(--bs-primary-bg-subtle);
  color: var(--color-text-primary);
}
.dropdown-item.active:hover {
  background: var(--bs-primary-border-subtle);
}
.dropdown-item.is-disabled {
  color: var(--color-text-secondary);
  cursor: not-allowed;
  pointer-events: none;
}
.menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-accent);
  flex-shrink: 0;
}
.menu-separator {
  height: 1px;
  margin: 8px 16px;
  background: var(--color-border);
  list-style: none;
}
.settings-option {
  max-width: 350px;
  padding: 4px 16px 8px;
  white-space: normal;
}
.settings-option label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  cursor: pointer;
}
input[type="checkbox"] {
  accent-color: var(--color-accent);
}
.settings-description {
  font-size: 13px;
  overflow-wrap: break-word;
  color: var(--color-text-secondary);
  padding-left: 24px;
  margin-top: 4px;
  line-height: 1.4;
  white-space: normal;
}
</style> 