<template>
  <div class="lcp-canvas lcp-editor-canvas" :class="`lcp-editor-canvas--${breakpoint}`" @click.self="store.clearSelection">
    <div v-if="store.componentTree.length === 0" class="lcp-canvas__empty">
      <Package class="lcp-canvas__empty-icon" />
      <p class="lcp-canvas__empty-text">Перетащите компоненты сюда</p>
      <p class="lcp-canvas__empty-hint">или кликните по компоненту в палитре</p>
    </div>

    <div 
      v-else
      class="lcp-canvas__drop-zone lcp-editor-canvas__content"
      :class="{ 'lcp-canvas__drop-zone--active': isDragOver }"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <CanvasComponent
        v-for="(item, index) in store.componentTree"
        :key="item.uid"
        :component="item"
        :index="index"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Package } from 'lucide-vue-next'
import { useEditorStore } from '../store/editor'
import CanvasComponent from './CanvasComponent.vue'

defineProps({
  breakpoint: {
    type: String,
    default: 'desktop'
  }
})

const store = useEditorStore()
const isDragOver = ref(false)

function onDragOver(e) {
  e.dataTransfer.dropEffect = 'copy'
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e) {
  isDragOver.value = false
  
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'))
    store.addComponent(data)
  } catch (err) {
    console.error('Ошибка при добавлении компонента:', err)
  }
}
</script>

