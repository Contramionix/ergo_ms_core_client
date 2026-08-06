<script setup>
/**
 * Единый рендер динамической Lucide-иконки по каноническому имени (PascalCase).
 * Модули и декларации (меню, apps, settings) передают строку — не Vue-компонент.
 */
import { shallowRef, watch } from 'vue'
import { LUCIDE_STROKE_WIDTH } from '@/config/coreIconNames.js'
import { getLucideIconAsync, normalizeLucideIconName } from '@/js/lucideIconLoader.js'

const props = defineProps({
  name: {
    type: String,
    default: '',
  },
  size: {
    type: [Number, String],
    default: 20,
  },
  strokeWidth: {
    type: [Number, String],
    default: LUCIDE_STROKE_WIDTH,
  },
  iconClass: {
    type: [String, Object, Array],
    default: '',
  },
})

const IconComponent = shallowRef(null)

watch(
  () => props.name,
  async (name) => {
    const key = normalizeLucideIconName(name)
    IconComponent.value = key ? await getLucideIconAsync(key) : null
  },
  { immediate: true },
)
</script>

<template>
  <component
    :is="IconComponent"
    v-if="IconComponent"
    :size="size"
    :stroke-width="strokeWidth"
    :class="iconClass"
  />
</template>
