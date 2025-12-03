<template>
  <div class="lcp-tree">
    <div v-if="store.componentTree.length === 0" class="text-center py-4 text-muted">
      <ListTree :size="32" class="mb-2 opacity-50" />
      <p class="small mb-0">Добавьте компоненты</p>
    </div>

    <TreeItem
      v-for="item in store.componentTree"
      :key="item.uid"
      :item="item"
      :level="0"
    />
  </div>
</template>

<script setup>
import { ListTree } from 'lucide-vue-next'
import { useEditorStore } from '../store/editor'
import TreeItem from './TreeItem.vue'

const store = useEditorStore()
</script>


