<template>
  <div class="lcp-properties">
    <div v-if="!store.selectedComponent" class="lcp-properties__empty">
      <MousePointer class="lcp-properties__empty-icon" />
      <p class="small text-muted">Выберите компонент</p>
    </div>

    <template v-else>
      <div class="lcp-properties__header">
        <span class="lcp-properties__header-title">
          {{ store.selectedComponent.name || store.selectedComponent.type }}
        </span>
        <button class="btn btn-sm btn-light" @click="store.clearSelection">
          <X :size="14" />
        </button>
      </div>

      <!-- Основные свойства -->
      <div class="lcp-properties__section">
        <div class="lcp-properties__section-title">
          <Settings :size="14" />
          Основные
        </div>

        <div class="lcp-properties__field">
          <label class="lcp-properties__field-label">Название</label>
          <input 
            v-model="store.selectedComponent.name" 
            type="text" 
            class="form-control form-control-sm"
            @input="onChange"
          >
        </div>

        <div class="lcp-properties__field">
          <label class="lcp-properties__field-label">Тип</label>
          <input 
            :value="store.selectedComponent.type" 
            type="text" 
            class="form-control form-control-sm"
            disabled
          >
        </div>
      </div>

      <!-- Свойства компонента -->
      <div class="lcp-properties__section">
        <div class="lcp-properties__section-title">
          <Sliders :size="14" />
          Свойства
        </div>

        <PropsEditor 
          :props="store.selectedComponent.props" 
          :component-type="store.selectedComponent.type"
          @update="updateProps"
        />
      </div>

      <!-- Стили -->
      <div class="lcp-properties__section">
        <div class="lcp-properties__section-title">
          <Palette :size="14" />
          Стили
        </div>

        <StylesEditor
          :styles="store.selectedComponent.styles"
          :classes="store.selectedComponent.classes"
          @update-styles="updateStyles"
          @update-classes="updateClasses"
        />
      </div>

      <!-- Видимость -->
      <div class="lcp-properties__section">
        <div class="lcp-properties__section-title">
          <Eye :size="14" />
          Видимость
        </div>

        <div class="lcp-properties__field">
          <label class="lcp-properties__field-label">Условие отображения</label>
          <input 
            v-model="store.selectedComponent.visible" 
            type="text" 
            class="form-control form-control-sm"
            placeholder="true или выражение"
            @input="onChange"
          >
          <small class="text-muted">Например: <code>&#123;&#123;user.role === 'admin'&#125;&#125;</code></small>
        </div>
      </div>

      <!-- Действия -->
      <div class="lcp-properties__section">
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary flex-grow-1" @click="duplicate">
            <Copy :size="14" class="me-1" />
            Дублировать
          </button>
          <button class="btn btn-sm btn-outline-danger" @click="remove">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { 
  MousePointer, X, Settings, Sliders, Palette, Eye, Copy, Trash2 
} from 'lucide-vue-next'
import { useEditorStore } from '../store/editor'
import PropsEditor from './PropsEditor.vue'
import StylesEditor from './StylesEditor.vue'

const store = useEditorStore()

function onChange() {
  // Триггерим историю через updateComponent
  if (store.selectedComponent) {
    store.updateComponent(store.selectedComponent.uid, {})
  }
}

function updateProps(props) {
  if (store.selectedComponent) {
    store.updateComponentProps(store.selectedComponent.uid, props)
  }
}

function updateStyles(styles) {
  if (store.selectedComponent) {
    store.updateComponent(store.selectedComponent.uid, { styles })
  }
}

function updateClasses(classes) {
  if (store.selectedComponent) {
    store.updateComponent(store.selectedComponent.uid, { classes })
  }
}

function duplicate() {
  if (store.selectedComponent) {
    const template = {
      ...store.selectedComponent,
      id: store.selectedComponent.templateId
    }
    store.addComponent(template)
  }
}

function remove() {
  if (store.selectedComponent) {
    store.removeComponent(store.selectedComponent.uid)
  }
}
</script>

