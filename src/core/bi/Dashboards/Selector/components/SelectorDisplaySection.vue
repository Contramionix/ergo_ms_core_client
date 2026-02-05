<template>
  <div class="settings-section">
    <h6 class="section-title">Отображение</h6>
    
    <div class="settings-row">
      <div class="settings-label">Заголовок</div>
      <div class="settings-control">
        <div class="input-group">
          <input 
            :value="selector.title"
            @input="updateTitle"
            type="text" 
            placeholder="Заголовок селектора"
            class="form-control"
          />
        </div>
        <div class="title-position-buttons">
          <button 
            class="position-btn" 
            style="border-top-right-radius: 0px !important;  border-bottom-right-radius: 0px !important; border-right-width: 0px;"
            :class="{ active: selector.titlePosition === 'hidden' }"
            @click="setTitlePosition('hidden')"
          >
            Скрыт
          </button>
          <button 
            class="position-btn" 
            style="border-radius: 0px !important; border-right-width: 0.5px;"
            :class="{ active: selector.titlePosition === 'left' }"
            @click="setTitlePosition('left')"
          >
            Слева
          </button>
          <button 
            class="position-btn" 
            style="border-top-left-radius: 0px !important;  border-bottom-left-radius: 0px !important; border-left-width: 0px;"
            :class="{ active: selector.titlePosition === 'top' }"
            @click="setTitlePosition('top')"
          >
            Сверху
          </button>
        </div>
      </div>
    </div>
    
    <div class="settings-row">
      <div class="settings-label">
        <input type="checkbox" :checked="selector.showInternalTitle" @change="updateShowInternalTitle" />Внутренний заголовок
        <div class="help-icon-wrapper">
          <HelpCircle 
            size="14" 
            class="help-icon" 
            @mouseenter="showInternalTitleTooltip = true"
            @mouseleave="showInternalTitleTooltip = false"
          />
          <div v-if="showInternalTitleTooltip" class="custom-tooltip">
            Внутренний заголовок позволяет указать текст внутри селектора. Например, его можно использовать для отображения операции внутри селектора.<br><br>Недоступен в селекторах типа «Чекбокс».
          </div>
        </div>
      </div>
      <div class="settings-control" v-if="selector.showInternalTitle">
        <input 
          :value="selector.internalTitle"
          @input="updateInternalTitle"
          type="text" 
          placeholder="Внутренний заголовок"
          class="form-control"
        />
      </div>
    </div>
    
    <div class="settings-row">
      <div class="settings-label">
        <input type="checkbox" :checked="selector.showColorAccent" @change="updateShowColorAccent" />
        Цветовой акцент
        <div class="help-icon-wrapper">
          <HelpCircle 
            size="14" 
            class="help-icon" 
            @mouseenter="showColorAccentTooltip = true"
            @mouseleave="showColorAccentTooltip = false"
          />
          <div v-if="showColorAccentTooltip" class="custom-tooltip">
            Используйте опцию для выделения цветом важных селекторов
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-row">
      <div class="settings-label">
        <input type="checkbox" :checked="selector.showHint" @change="updateShowHint" />
        Подсказка
      </div>
      <div class="settings-control" v-if="selector.showHint">
        <div class="text-editor-wrapper">
          <TextEditor 
            :model-value="selector.hintText"
            :content="selector.hintText"
            @update:hintText="updateHintText"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { HelpCircle } from 'lucide-vue-next'
import TextEditor from '../../components/TextEditor.vue'

const props = defineProps({
  selector: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:selector'])

const showInternalTitleTooltip = ref(false)
const showColorAccentTooltip = ref(false)

function updateTitle(event) {
  emit('update:selector', {
    ...props.selector,
    title: event.target.value
  })
}

function setTitlePosition(position) {
  emit('update:selector', {
    ...props.selector,
    titlePosition: position
  })
}

function updateShowInternalTitle(event) {
  emit('update:selector', {
    ...props.selector,
    showInternalTitle: event.target.checked
  })
}

function updateInternalTitle(event) {
  emit('update:selector', {
    ...props.selector,
    internalTitle: event.target.value
  })
}

function updateShowColorAccent(event) {
  emit('update:selector', {
    ...props.selector,
    showColorAccent: event.target.checked
  })
}

function updateShowHint(event) {
  emit('update:selector', {
    ...props.selector,
    showHint: event.target.checked
  })
}

function updateHintText(value) {
  emit('update:selector', {
    ...props.selector,
    hintText: value
  })
}
</script>

<style scoped lang="scss">
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: visible;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.settings-row {
  display: flex;
  align-items: flex-start;
  min-height: 40px;
  overflow: visible;
}

.settings-label {
  width: 215px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  padding-right: 16px;
  
  input[type="checkbox"] {
    margin: 0;
    accent-color: var(--color-accent);
  }
  
  .help-icon {
    color: var(--color-text-secondary);
    cursor: help;
  }
}

.settings-control {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group {
  display: flex;
  position: relative;
  overflow: visible;
  align-items: center;
  width: 100%;
  max-width: 100%;
}

.form-control {
  background: var(--color-background);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
  height: 31px;
  transition: border-color 0.2s ease;
  
  &::placeholder {
    color: var(--color-text-secondary);
  }
  
  &:hover {
    border-color: var(--color-primary-text);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-primary-text);
    box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
  }
}

.title-position-buttons {
  display: flex;
  width: 100%;
}

.position-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  
  &:hover {
    border-color: var(--color-primary);
    background: var(--color-hover-background);
    border-width: 1px !important;
  }
  
  &.active {
    background: var(--color-primary-background);
    color: var(--color-primary-text);
    font-weight: 650;
    border-color: var(--color-primary);
    border-width: 1px !important;
  }
}

.help-icon-wrapper {
  position: relative;
  display: inline-block;
}

.custom-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-background);
  color: var(--color-text-primary);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  white-space: normal;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  margin-bottom: 8px;
  max-width: 250px;
  min-width: 150px;
  width: max-content;
  word-wrap: break-word;
  text-align: center;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid var(--color-background);
    filter: drop-shadow(0 1px 0 var(--color-border));
  }
}

.text-editor-wrapper {
  max-width: 100%;
  overflow: hidden;
  
  :deep(.text-editor) {
    max-width: 100%;
    width: 100%;
    
    .editor-toolbar {
      flex-wrap: wrap;
      gap: 2px;
      
      .toolbar-formatting,
      .toolbar-styles,
      .toolbar-actions {
        flex-wrap: wrap;
      }
    }
    
    .editor-content {
      max-width: 100%;
      
      .editor-textarea {
        max-width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
    }
  }
}
</style>
