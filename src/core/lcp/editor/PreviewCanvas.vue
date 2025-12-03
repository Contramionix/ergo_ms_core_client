<template>
  <div class="lcp-canvas lcp-preview">
    <div v-if="store.componentTree.length === 0" class="lcp-canvas__empty">
      <Eye class="lcp-canvas__empty-icon" />
      <p class="lcp-canvas__empty-text">Нет компонентов для предпросмотра</p>
    </div>

    <div v-else class="lcp-preview__content" :class="`lcp-preview__content--${breakpoint}`">
      <RuntimeComponent
        v-for="item in store.componentTree"
        :key="item.uid"
        :component="item"
        :edit-mode="false"
      />
    </div>
  </div>
</template>

<script setup>
import { Eye } from 'lucide-vue-next'
import { useEditorStore } from '../store/editor'
import RuntimeComponent from '../runtime/RuntimeComponent.vue'

defineProps({
  breakpoint: {
    type: String,
    default: 'desktop'
  }
})

const store = useEditorStore()
</script>

