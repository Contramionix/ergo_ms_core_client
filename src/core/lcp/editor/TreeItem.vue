<template>
  <div class="lcp-tree__node">
    <div 
      class="lcp-tree__item"
      :class="{ 'lcp-tree__item--selected': store.selectedComponentId === item.uid }"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      @click="store.selectComponent(item.uid)"
    >
      <!-- Toggle для вложенных -->
      <span 
        v-if="hasChildren" 
        class="lcp-tree__item-toggle"
        @click.stop="isOpen = !isOpen"
      >
        <ChevronRight :size="14" :class="{ 'rotate-90': isOpen }" />
      </span>
      <span v-else class="lcp-tree__item-toggle"></span>

      <!-- Иконка -->
      <component :is="getIcon(item.icon || 'Box')" class="lcp-tree__item-icon" />

      <!-- Название -->
      <span class="lcp-tree__item-name">{{ item.name || item.type }}</span>

      <!-- Действия -->
      <div class="lcp-tree__item-actions" @click.stop>
        <button 
          class="btn btn-sm p-0"
          @click="store.removeComponent(item.uid)"
          title="Удалить"
        >
          <Trash2 :size="12" class="text-danger" />
        </button>
      </div>
    </div>

    <!-- Вложенные элементы -->
    <Transition name="collapse">
      <div v-if="hasChildren && isOpen" class="lcp-tree__children">
        <TreeItem
          v-for="child in item.children"
          :key="child.uid"
          :item="child"
          :level="level + 1"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as Icons from 'lucide-vue-next'
import { ChevronRight, Trash2 } from 'lucide-vue-next'
import { useEditorStore } from '../store/editor'

const props = defineProps({
  item: { type: Object, required: true },
  level: { type: Number, default: 0 }
})

const store = useEditorStore()
const isOpen = ref(true)

const hasChildren = computed(() => props.item.children?.length > 0)
const getIcon = (name) => Icons[name] || Icons.Box
</script>

<style scoped>
.lcp-tree__item {
  display: flex;
  align-items: center;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.15s ease;
  gap: 0.25rem;
}

.lcp-tree__item:hover {
  background: #f8f9fa;
}

.lcp-tree__item--selected {
  background: rgba(var(--bs-primary-rgb), 0.1);
  color: var(--bs-primary);
}

.lcp-tree__item-toggle {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.lcp-tree__item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.lcp-tree__item-name {
  flex: 1;
  font-size: 0.8125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lcp-tree__item-actions {
  opacity: 0;
  transition: opacity 0.15s;
}

.lcp-tree__item:hover .lcp-tree__item-actions {
  opacity: 1;
}

.rotate-90 {
  transform: rotate(90deg);
  transition: transform 0.2s;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>


