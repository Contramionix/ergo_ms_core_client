<template>
  <div 
    class="lcp-component"
    :class="{ 'lcp-component--selected': isSelected }"
    @click.stop="store.selectComponent(component.uid)"
  >
    <!-- Toolbar -->
    <div class="lcp-component__toolbar">
      <span class="lcp-component__toolbar-name">{{ component.name || component.type }}</span>
      <button class="lcp-component__toolbar-btn" @click.stop="store.selectComponent(component.uid)" title="Настройки">
        <Settings :size="12" />
      </button>
      <button class="lcp-component__toolbar-btn" @click.stop="duplicate" title="Дублировать">
        <Copy :size="12" />
      </button>
      <button class="lcp-component__toolbar-btn" @click.stop="remove" title="Удалить">
        <Trash2 :size="12" />
      </button>
    </div>

    <!-- Content -->
    <div class="lcp-component__content">
      <RuntimeComponent :component="component" :edit-mode="true" />
    </div>

    <!-- Drop zone для вложенных компонентов -->
    <div 
      v-if="canHaveChildren"
      class="lcp-component__drop-zone"
      :class="{ 'lcp-component__drop-zone--active': isChildDragOver }"
      @dragover.prevent="onChildDragOver"
      @dragleave="onChildDragLeave"
      @drop.stop="onChildDrop"
    >
      <!-- Вложенные компоненты -->
      <CanvasComponent
        v-for="(child, idx) in component.children"
        :key="child.uid"
        :component="child"
        :index="idx"
        :parent-id="component.uid"
      />
      
      <div v-if="!component.children?.length" class="lcp-component__drop-hint">
        <Plus :size="16" class="me-1" />
        Перетащите сюда
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Settings, Copy, Trash2, Plus } from 'lucide-vue-next'
import { useEditorStore } from '../store/editor'
import RuntimeComponent from '../runtime/RuntimeComponent.vue'

const props = defineProps({
  component: { type: Object, required: true },
  index: { type: Number, default: 0 },
  parentId: { type: String, default: null }
})

const store = useEditorStore()
const isChildDragOver = ref(false)

const isSelected = computed(() => store.selectedComponentId === props.component.uid)

// Определяем, может ли компонент содержать дочерние элементы
const canHaveChildren = computed(() => {
  const containerTypes = ['Container', 'Row', 'Column', 'Card', 'Form', 'Grid', 'Section']
  return containerTypes.includes(props.component.type)
})

function duplicate() {
  const template = {
    ...props.component,
    id: props.component.templateId
  }
  store.addComponent(template, props.parentId, props.index + 1)
}

function remove() {
  store.removeComponent(props.component.uid)
}

function onChildDragOver(e) {
  e.dataTransfer.dropEffect = 'copy'
  isChildDragOver.value = true
}

function onChildDragLeave() {
  isChildDragOver.value = false
}

function onChildDrop(e) {
  isChildDragOver.value = false
  
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'))
    store.addComponent(data, props.component.uid)
  } catch (err) {
    console.error('Ошибка при добавлении компонента:', err)
  }
}
</script>

<style scoped>
.lcp-component__drop-zone {
  min-height: 60px;
  border: 1px dashed #dee2e6;
  border-radius: 0.25rem;
  margin: 0.5rem;
  padding: 0.5rem;
  transition: all 0.2s;
}

.lcp-component__drop-zone--active {
  border-color: var(--bs-primary);
  background: rgba(var(--bs-primary-rgb), 0.05);
}

.lcp-component__drop-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #adb5bd;
  font-size: 0.875rem;
}
</style>


